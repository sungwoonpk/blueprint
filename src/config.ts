// Site identity. The header, page titles and footer read from here.
export const SITE = {
  /** Always lowercase. */
  name: 'blueprint',
  author: 'Sungwoon Park',
  /** Subjects shown in the header menu, in order. The first one is the home page. */
  sections: [
    { name: 'System Design', href: '/system-design' },
    { name: 'Algorithms', href: '/algorithms', soon: true },
  ],
  description: 'blueprint is a system design study guide, from the basics to distributed systems and the classic papers.',
};
