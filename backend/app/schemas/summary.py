from pydantic import BaseModel


class SummaryUpdate(BaseModel):
    """Model for updating a summary's content.

    Attributes
    ----------
    content: str
        The new content for the summary.
    """

    content: str