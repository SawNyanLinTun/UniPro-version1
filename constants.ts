
import { Internship, InternshipCategory } from './types';

export const MOCK_INTERNSHIPS: Internship[] = [
  {
    id: '1',
    title: 'Distributed Systems Associate',
    company: 'Agoda',
    location: 'Bangkok',
    type: 'onsite',
    duration: '3-6 months',
    category: InternshipCategory.SOFTWARE,
    description: 'Build the backbone of modern infrastructure. Focus on low-latency data streams and scaling global travel systems.',
    stipend: '฿25,000/mo',
    tags: ['Go', 'Kubernetes', 'Redis'],
    postedDate: '2024-03-01',
    deadline: '2024-04-15'
  },
  {
    id: '2',
    title: 'UI/UX Design Intern',
    company: 'Lineman Wongnai',
    location: 'Bangkok',
    type: 'hybrid',
    duration: '4 months',
    category: InternshipCategory.DESIGN,
    description: 'Define the physical language of virtual objects. Master the art of fluid interactions for millions of users.',
    stipend: '฿18,000/mo',
    tags: ['Figma', 'Framer', 'Product Design'],
    postedDate: '2024-03-05',
    deadline: '2024-04-20'
  },
  {
    id: '3',
    title: 'Data Science Intern',
    company: 'SCB 10X',
    location: 'Bangkok',
    type: 'onsite',
    duration: '6 months',
    category: InternshipCategory.DATA_SCIENCE,
    description: 'Work at the intersection of ethics and architecture. Fine-tune the future of cognition for Southeast Asian languages.',
    stipend: '฿30,000/mo',
    tags: ['Python', 'LLMs', 'NLP'],
    postedDate: '2024-02-28',
    deadline: '2024-03-30'
  },
  {
    id: '4',
    title: 'Digital Marketing Strategist',
    company: 'Shopee Thailand',
    location: 'Bangkok',
    type: 'remote',
    duration: '3 months',
    category: InternshipCategory.MARKETING,
    description: 'Drive user acquisition and engagement through data-backed marketing strategies and campaign operations.',
    stipend: '฿15,000/mo',
    tags: ['SEO', 'Content Strategy', 'Ads'],
    postedDate: '2024-03-10',
    deadline: '2024-05-01'
  },
  {
    id: '5',
    title: 'Business Development Intern',
    company: 'KBTG',
    location: 'Nonthaburi',
    type: 'hybrid',
    duration: '6 months',
    category: InternshipCategory.BUSINESS,
    description: 'Analyze digital transformation trends in the banking sector. Help define the future of mobile payments.',
    stipend: '฿22,000/mo',
    tags: ['Fintech', 'Strategy', 'Agile'],
    postedDate: '2024-03-02',
    deadline: '2024-04-10'
  },
  {
    id: '6',
    title: 'Full Stack Developer',
    company: 'Seven Peaks Software',
    location: 'Bangkok',
    type: 'onsite',
    duration: '4-6 months',
    category: InternshipCategory.SOFTWARE,
    description: 'Join an international team building enterprise-grade applications using React and Node.js.',
    stipend: '฿20,000/mo',
    tags: ['React', 'Node.js', 'TypeScript'],
    postedDate: '2024-03-08',
    deadline: '2024-04-25'
  },
  {
    id: '7',
    title: 'Machine Learning Engineer',
    company: 'Omise',
    location: 'Phuket',
    type: 'remote',
    duration: '6 months',
    category: InternshipCategory.DATA_SCIENCE,
    description: 'Help develop fraud detection models and automated payment routing algorithms.',
    stipend: '฿28,000/mo',
    tags: ['PyTorch', 'Scikit-learn', 'AWS'],
    postedDate: '2024-03-12',
    deadline: '2024-05-15'
  }
];
