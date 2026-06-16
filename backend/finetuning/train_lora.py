"""
담당: A (LLM1), B (LLM2)
LoRA 파인튜닝 — Google Colab A100 실행 권장

실행:
    python pipeline/finetune/train_lora.py --target llm1 --model google/gemma-3-2b-it
    python pipeline/finetune/train_lora.py --target llm2 --model google/gemma-3-2b-it
"""
import argparse
from pathlib import Path

# Colab에서 설치:
# !pip install transformers peft datasets trl accelerate bitsandbytes -q

MODEL_OUTPUT = {
    "llm1": "models/llm1-lora",
    "llm2": "models/llm2-lora",
}
DATA_PATH = {
    "llm1": "data/finetune/llm1/train.jsonl",
    "llm2": "data/finetune/llm2/train.jsonl",
}


def train(target: str, base_model: str):
    from transformers import AutoTokenizer, AutoModelForCausalLM, TrainingArguments
    from peft import LoraConfig, get_peft_model, TaskType
    from trl import SFTTrainer
    from datasets import load_dataset

    print(f"=== LoRA Fine-tuning: {target} | base: {base_model} ===")

    # 데이터셋 로드
    dataset = load_dataset("json", data_files=DATA_PATH[target], split="train")

    # 토크나이저
    tokenizer = AutoTokenizer.from_pretrained(base_model)
    tokenizer.pad_token = tokenizer.eos_token

    # 모델 로드 (4bit quantization for Colab)
    from transformers import BitsAndBytesConfig
    import torch
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16,
    )
    model = AutoModelForCausalLM.from_pretrained(
        base_model,
        quantization_config=bnb_config,
        device_map="auto",
    )

    # LoRA 설정
    lora_config = LoraConfig(
        task_type=TaskType.CAUSAL_LM,
        r=16,           # rank
        lora_alpha=32,
        lora_dropout=0.05,
        target_modules=["q_proj", "v_proj"],  # Gemma attention layers
    )
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    # 학습 설정
    training_args = TrainingArguments(
        output_dir=MODEL_OUTPUT[target],
        num_train_epochs=3,
        per_device_train_batch_size=4,
        gradient_accumulation_steps=4,
        learning_rate=2e-4,
        fp16=True,
        logging_steps=50,
        save_steps=200,
        save_total_limit=2,
    )

    # 학습
    def format_prompt(row):
        return f"### Instruction:\n{row['instruction']}\n\n### Input:\n{row['input']}\n\n### Response:\n{row['output']}"

    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=dataset,
        formatting_func=format_prompt,
        args=training_args,
        max_seq_length=2048,
    )
    trainer.train()
    trainer.save_model(MODEL_OUTPUT[target])
    print(f"Model saved to {MODEL_OUTPUT[target]}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--target", choices=["llm1", "llm2"], required=True)
    parser.add_argument("--model", default="google/gemma-3-2b-it")
    args = parser.parse_args()
    train(args.target, args.model)
