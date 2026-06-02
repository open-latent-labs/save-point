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
    desc: '이 문서는 Atlassian 제품 소개 정보를 공유하기 위해 작성되었다.',
    sections: [
      {
        title: 'For Every Team',
        rows: [
          { name: 'Jira Software', desc: '애자일 방법론 기반의 소프트웨어 개발 프로젝트 관리를 지원합니다.' },
          { name: 'Jira Service Management', desc: '고객 지원 및 낮은 직원 서비스 경험을 빠르게 제공합니다.' },
          { name: 'Jira Work Management', desc: '업무 관리에 적합한 다양한 뷰와 최적의 환경을 제공합니다.' },
          { name: 'Jira Product Discovery', desc: '아이디어 정의, 제품 로드맵 공유 등 협업 환경을 제공합니다.' },
          { name: 'Statuspage', desc: '조직의 모든 서비스 가동 중지에 대한 정보 및 이력을 제공합니다.' },
          { name: 'Opsgenie', desc: '문제에 적절한 사람을 할당하고 다양한 알림을 설정할 수 있습니다.' },
        ],
      },
      {
        title: 'Collaborate',
        rows: [
          { name: 'Confluence', desc: '조직의 Knowledge Base를 구축하고 협업 작성 및 공유할 수 있게 해줍니다.' },
          { name: 'Trello', desc: '모든 팀이 자신의 방식으로 작업을 계획, 추적, 수행할 수 있는 작업관리 도구입니다.' },
          { name: 'Atlas', desc: '언제 어디서나 팀, 앱 및 업무를 연결하는 최초의 팀워크 디렉토리입니다.' },
        ],
      },
      {
        title: 'Code, Build and Ship',
        rows: [
          { name: 'Bitbucket', desc: 'Git 기반으로 저장소를 체계적으로 관리할 수 있게 해줍니다.' },
        ],
      },
    ],
  },
  'overview': {
    breadcrumb: ['페이지', 'DevOps Home', 'Atlassian Product', 'Atlassian 제품 소개'],
    title: 'Atlassian 제품 개요',
    meta: '작성자: DevOps팀 · 2025-01-15',
    desc: 'Atlassian은 팀이 협업하고, 계획하고, 소프트웨어를 더 잘 개발할 수 있도록 돕는 소프트웨어 제품군을 제공합니다.',
    sections: [
      {
        title: '제품 카테고리',
        rows: [
          { name: '프로젝트 관리', desc: 'Jira Software, Jira Work Management, Jira Product Discovery' },
          { name: 'IT 서비스 관리', desc: 'Jira Service Management, Opsgenie, Statuspage' },
          { name: '협업 도구', desc: 'Confluence, Trello, Atlas' },
          { name: '개발 도구', desc: 'Bitbucket, Bamboo, Crowd' },
        ],
      },
    ],
  },
  'jira-software': {
    breadcrumb: ['페이지', 'DevOps Home', 'Atlassian Product', 'Atlassian 제품 소개'],
    title: 'Atlassian Jira Software 소개',
    meta: '작성자: 개발팀 · 2025-02-10',
    desc: 'Jira Software는 소프트웨어 개발 팀을 위한 프로젝트 관리 도구입니다. 스크럼, 칸반 보드를 통해 이슈를 추적하고 스프린트를 관리합니다.',
    sections: [
      {
        title: '주요 기능',
        rows: [
          { name: '스크럼 보드', desc: '스프린트 계획, 일일 스탠드업, 스프린트 리뷰를 지원합니다.' },
          { name: '칸반 보드', desc: '지속적인 흐름 기반 업무 관리를 시각화합니다.' },
          { name: '백로그 관리', desc: '우선순위에 따라 이슈를 정렬하고 스프린트에 추가합니다.' },
          { name: '보고서', desc: '번다운 차트, 속도 차트 등 다양한 애자일 보고서를 제공합니다.' },
          { name: 'DevOps 통합', desc: 'Bitbucket, GitHub, GitLab과 연동해 코드 변경사항을 추적합니다.' },
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
    desc: '이 페이지의 내용은 아직 작성 중입니다.',
    sections: [],
  };
}
