export const docsTree = [
  { id: 'pages', label: '페이지', type: 'file', children: [] },
  { id: 'blog', label: '블로그', type: 'folder', children: [] },
  { id: 'team-files', label: 'Team Files', type: 'folder', children: [] },
  {
    id: 'atlassian-product',
    label: 'Atlassian Product',
    type: 'folder',
    defaultExpanded: true,
    children: [
      {
        id: 'atlassian-intro',
        label: 'Atlassian 제품 소개',
        type: 'folder',
        defaultExpanded: true,
        children: [
          { id: 'overview', label: 'Atlassian 제품 개요', type: 'file' },
          { id: 'jira-software', label: 'Atlassian Jira Software 소개', type: 'file' },
          { id: 'jira-work', label: 'Atlassian Jira Work Management 소개', type: 'file' },
          { id: 'confluence', label: 'Atlassian Confluence 소개', type: 'file' },
          { id: 'confluence-cloud', label: 'Atlassian Confluence Cloud 소개', type: 'file' },
          { id: 'cloud-standard', label: 'Atlassian Cloud Standard VS Premium', type: 'file' },
          { id: 'jira-service', label: 'Atlassian Jira Service Management 소개', type: 'file' },
          { id: 'bitbucket-doc', label: 'Atlassian Bitbucket 소개', type: 'file' },
          { id: 'bamboo', label: 'Atlassian Bamboo 소개', type: 'file' },
          { id: 'crowd', label: 'Atlassian Crowd 소개', type: 'file' },
        ],
      },
      { id: 'install-guide', label: 'Atlassian 설치 가이드', type: 'folder', children: [] },
      { id: 'datacenter-guide', label: 'Atlassian Data Center 제품 가이드', type: 'folder', children: [] },
      { id: 'cloud-guide', label: 'Atlassian Cloud 제품 가이드', type: 'folder', children: [] },
      { id: 'cloud-faq', label: 'Atlassian Cloud FAQ', type: 'file' },
      { id: 'release-notes', label: 'Atlassian 제품 릴리즈 노트', type: 'folder', children: [] },
      { id: 'knowledge-base', label: 'Atlassian Knowledge Base', type: 'folder', children: [] },
      { id: 'addons', label: 'Atlassian 애드온', type: 'folder', children: [] },
      { id: 'security', label: 'Atlassian 보안 취약성 공지', type: 'folder', children: [] },
      { id: 'faq', label: 'Atlassian FAQ', type: 'folder', children: [] },
    ],
  },
];

function walkTree(nodes) {
  const ids = new Set();
  for (const n of nodes) {
    if (n.defaultExpanded) ids.add(n.id);
    if (n.children?.length) walkTree(n.children).forEach((id) => ids.add(id));
  }
  return ids;
}

export const defaultExpandedIds = walkTree(docsTree);

function findNode(nodes, id) {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children?.length) {
      const found = findNode(n.children, id);
      if (found) return found;
    }
  }
  return null;
}

const docsContent = {
  'atlassian-intro': {
    breadcrumb: ['페이지', 'DevOps Home', 'Atlassian Product'],
    title: 'Atlassian 제품 소개',
    meta: '작성자: 김진호 이사 · 마지막 업데이트: 윤순호 책임 · 2025-04-30 · 1분 읽기',
    desc: '이 문서는 Atlassian 제품군에 대한 전반적인 소개 정보를 공유하기 위해 작성되었다.\n\nAtlassian은 소프트웨어 개발 팀의 협업과 생산성 향상을 목표로 다양한 제품을 제공한다. 프로젝트 관리, IT 서비스 관리, 협업 도구, 개발 도구 등 크게 네 가지 카테고리로 나뉘며, 각 제품은 서로 긴밀하게 통합되어 있다.\n\n팀의 규모나 업무 방식에 관계없이 Atlassian 생태계 안에서 일관된 업무 흐름을 유지할 수 있도록 설계되어 있으며, Cloud 및 Data Center 환경 모두를 지원한다.',
    sections: [
      {
        title: 'For Every Team',
        rows: [
          {
            name: 'Jira Software',
            desc: '스크럼 및 칸반 보드 기반의 애자일 프로젝트 관리 도구로, 이슈 트래킹과 스프린트 계획을 통해 개발 팀의 업무 흐름을 체계적으로 관리할 수 있다.\n\nBitbucket, GitHub 등 개발 도구와 연동하여 코드 변경 이력도 함께 추적할 수 있다.',
          },
          {
            name: 'Jira Service Management',
            desc: '고객 요청과 내부 서비스 요청을 통합 관리하는 IT 서비스 관리(ITSM) 도구이다.\n\n인시던트 관리, 변경 관리, 자산 관리 등의 기능을 제공하며, 고객과 서비스 팀 간의 소통 채널을 단일화하여 빠른 대응이 가능하다.',
          },
          {
            name: 'Jira Work Management',
            desc: '비개발 직군을 위한 업무 관리 도구로, 리스트·보드·캘린더·타임라인 등 다양한 뷰를 통해 업무 진행 상황을 한눈에 파악할 수 있다.\n\n마케팅, 인사, 재무 등 다양한 팀에서 활용하기 적합하다.',
          },
          {
            name: 'Jira Product Discovery',
            desc: '제품 아이디어를 수집하고 우선순위를 정하는 제품 발견 도구이다.\n\n아이디어 등록, 투표, 로드맵 공유 등을 통해 제품 팀이 고객 중심으로 방향성을 정하고 이해관계자와 투명하게 소통할 수 있도록 지원한다.',
          },
          {
            name: 'Statuspage',
            desc: '서비스 가동 상태를 실시간으로 공유하는 상태 페이지 도구이다.\n\n장애 발생 시 고객에게 즉시 알림을 전송하고, 서비스 복구 이력을 관리할 수 있어 신뢰도 유지에 도움이 된다.',
          },
          {
            name: 'Opsgenie',
            desc: '온콜 일정 관리와 알림 라우팅을 통해 인시던트 대응 팀을 효율적으로 운영할 수 있도록 돕는 도구이다.\n\n다양한 모니터링 툴과 연동하여 장애 발생 시 적절한 담당자에게 자동으로 알림을 전달한다.',
          },
        ],
      },
      {
        title: 'Collaborate',
        rows: [
          {
            name: 'Confluence',
            desc: '팀의 지식을 문서화하고 공유하는 협업 위키 도구이다.\n\n페이지, 스페이스, 템플릿 기능을 통해 조직의 Knowledge Base를 체계적으로 구축할 수 있으며, Jira와의 연동으로 프로젝트 맥락을 함께 관리할 수 있다.',
          },
          {
            name: 'Trello',
            desc: '칸반 보드 기반의 직관적인 작업 관리 도구이다.\n\n카드와 리스트를 자유롭게 구성하여 팀 내 업무를 시각적으로 관리할 수 있으며, 다양한 플러그인(Power-Up)을 통해 기능을 확장할 수 있다.',
          },
          {
            name: 'Atlas',
            desc: '조직 내 팀, 프로젝트, 목표를 한 곳에서 연결하는 팀워크 디렉토리이다.\n\n각 팀의 진행 상황과 목표를 투명하게 공유함으로써 조직 전체의 방향 정렬을 돕는다.',
          },
        ],
      },
      {
        title: 'Code, Build and Ship',
        rows: [
          {
            name: 'Bitbucket',
            desc: 'Git 기반의 소스 코드 저장소 관리 도구로, 브랜치 전략 수립과 코드 리뷰를 지원한다.\n\nJira Software와 연동하면 커밋·PR·브랜치를 이슈와 직접 연결할 수 있으며, Bamboo와 함께 CI/CD 파이프라인도 구성할 수 있다.',
          },
        ],
      },
    ],
  },
  'overview': {
    breadcrumb: ['페이지', 'DevOps Home', 'Atlassian Product', 'Atlassian 제품 소개'],
    title: 'Atlassian 제품 개요',
    meta: '작성자: DevOps팀 · 2025-01-15',
    desc: 'Atlassian은 소프트웨어 개발 팀이 더 잘 협업하고 빠르게 제품을 출시할 수 있도록 지원하는 제품군을 제공한다.\n\n제품군은 크게 네 가지 영역으로 구성된다. 프로젝트 관리 영역에는 Jira Software, Jira Work Management, Jira Product Discovery가 포함되며, IT 서비스 관리 영역에는 Jira Service Management, Opsgenie, Statuspage가 있다. 협업 도구로는 Confluence, Trello, Atlas를 제공하고, 개발 파이프라인을 위한 도구로는 Bitbucket, Bamboo, Crowd가 있다.\n\n모든 제품은 단독으로도 사용할 수 있지만, 함께 사용할 때 가장 강력한 시너지를 발휘하도록 설계되어 있다.',
    sections: [
      {
        title: '제품 카테고리',
        rows: [
          {
            name: '프로젝트 관리',
            desc: 'Jira Software는 개발 팀을 위한 애자일 프로젝트 관리 도구이며, Jira Work Management는 비개발 직군의 업무 관리를 지원한다.\n\nJira Product Discovery는 제품 아이디어 수집 및 우선순위 결정에 특화되어 있다.',
          },
          {
            name: 'IT 서비스 관리',
            desc: 'Jira Service Management는 고객 요청 및 내부 서비스 요청을 통합 관리하는 ITSM 플랫폼이다.\n\nOpsgenie는 온콜 알림 및 인시던트 대응을 자동화하고, Statuspage는 서비스 상태를 외부에 실시간으로 공유할 수 있게 해준다.',
          },
          {
            name: '협업 도구',
            desc: 'Confluence는 팀 지식을 문서화하는 위키 도구이고, Trello는 칸반 방식의 간단한 작업 관리를 지원한다.\n\nAtlas는 조직 전체의 팀과 목표를 연결하는 팀워크 디렉토리 역할을 한다.',
          },
          {
            name: '개발 도구',
            desc: 'Bitbucket은 Git 기반의 소스 코드 저장소 관리 도구이며, Bamboo는 CI/CD 파이프라인 자동화를 담당한다.\n\nCrowd는 조직 전체의 사용자 인증 및 싱글 사인온(SSO)을 중앙에서 관리할 수 있게 해주는 디렉토리 서비스이다.',
          },
        ],
      },
    ],
  },
  'jira-software': {
    breadcrumb: ['페이지', 'DevOps Home', 'Atlassian Product', 'Atlassian 제품 소개'],
    title: 'Atlassian Jira Software 소개',
    meta: '작성자: 개발팀 · 2025-02-10',
    desc: 'Jira Software는 소프트웨어 개발 팀을 위한 프로젝트 관리 도구로, 애자일 방법론을 기반으로 설계되었다.\n\n스크럼과 칸반 보드를 통해 이슈를 시각적으로 추적하고, 스프린트 단위로 개발 일정을 체계적으로 관리할 수 있다. 번다운 차트, 속도 차트 등의 보고서를 통해 팀의 생산성을 측정하고 개선 포인트를 파악하는 데 유용하다.\n\nBitbucket, GitHub, GitLab 등 외부 개발 도구와 연동되어 코드 커밋과 PR을 이슈와 직접 연결할 수 있으며, 개발 진행 상황을 코드 레벨에서 추적하는 것이 가능하다.',
    sections: [
      {
        title: '주요 기능',
        rows: [
          {
            name: '스크럼 보드',
            desc: '스프린트 계획, 일일 스탠드업, 스프린트 리뷰와 같은 스크럼 이벤트를 효과적으로 운영할 수 있도록 지원한다.\n\n백로그에서 이슈를 선택해 스프린트를 구성하고, 진행 상황을 열(column) 기반으로 시각화할 수 있다.',
          },
          {
            name: '칸반 보드',
            desc: '스프린트 단위 없이 지속적인 업무 흐름을 관리하는 방식으로, WIP(진행 중인 작업) 제한을 통해 팀의 집중도를 높일 수 있다.\n\n운영, 유지보수 등 반복적이고 흐름 기반의 업무에 적합하다.',
          },
          {
            name: '백로그 관리',
            desc: '우선순위에 따라 이슈를 정렬하고 스프린트에 추가하는 공간으로, 제품 관리자와 개발 팀이 함께 작업 순서를 조율할 수 있다.\n\n에픽, 스토리, 태스크 등 이슈 유형별로 계층 구조를 형성해 복잡한 프로젝트도 체계적으로 관리할 수 있다.',
          },
          {
            name: '보고서',
            desc: '번다운 차트는 스프린트 내 잔여 작업량 변화를 시각화하며, 속도 차트는 팀이 스프린트마다 완료하는 작업량의 추이를 보여준다.\n\n이 외에도 누적 흐름 다이어그램, 스프린트 보고서 등을 통해 팀 성과를 다각도로 분석할 수 있다.',
          },
          {
            name: 'DevOps 통합',
            desc: 'Bitbucket, GitHub, GitLab과 연동하면 커밋 메시지에 이슈 키를 포함하는 것만으로 코드 변경 이력을 이슈와 자동 연결할 수 있다.\n\nPR 상태, 빌드 결과, 배포 이력을 Jira 이슈 화면에서 직접 확인할 수 있어 개발 사이클 전반을 한 곳에서 추적하는 것이 가능하다.',
          },
        ],
      },
    ],
  },
};

export function getDocContent(id) {
  if (docsContent[id]) return docsContent[id];
  const node = findNode(docsTree, id);
  return {
    breadcrumb: ['페이지'],
    title: node ? node.label : id,
    meta: '',
    desc: '요약 내용이 비어 있습니다.',
    sections: [],
  };
}
