const QUIZ = [
  { q: 'What is the time complexity of binary search on a sorted array?', o: ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'], a: 1 },
  { q: 'Which HTTP status code means a resource was successfully created?', o: ['200', '201', '204', '302'], a: 1 },
  { q: 'Which value is truthy in JavaScript?', o: ['0', '""', '"0"', 'null'], a: 2 },
  { q: 'Which Git command integrates another branch into your current branch?', o: ['git merge', 'git stash', 'git blame', 'git init'], a: 0 },
  { q: 'What is the most effective defence against SQL injection?', o: ['Hiding error messages', 'Parameterized queries', 'Longer passwords', 'Client-side validation only'], a: 1 },
  { q: 'In Jetpack Compose, which holds state that survives recomposition?', o: ['val x = 0', 'remember { mutableStateOf(0) }', 'const x = 0', 'lateinit var x'], a: 1 }
];
const publicQuiz = () => QUIZ.map(({ q, o }) => ({ q, o }));
const list = s => String(s || '').split(/[,;\n]/).map(x => x.trim()).filter(Boolean);
const cl = (v, m) => Math.max(0, Math.min(m, Math.round(v)));
function assess(a, ans) {
  const L = list(a.languages).length, F = list(a.frameworks).length, T = list(a.tools).length;
  const programming = cl(Math.min(L, 5) * 2.2 + Math.min(F, 5) * 1.2 + Math.min(T, 4) * .75, 20);
  const ps = a.projects.map(p => (p.description.length >= 80 ? 5 : p.description.length >= 30 ? 2 : 0) + (p.repo ? 6 : 0) + (p.demo ? 4 : 0) + (p.shots.length ? 2 : 0) + (list(p.tech).length >= 2 ? 4 : list(p.tech).length ? 2 : 0) + (p.contribution.length >= 40 ? 4 : p.contribution.length ? 2 : 0)).sort((x, y) => y - x).slice(0, 3);
  const project = ps.length ? cl(ps.reduce((s, x) => s + x, 0) / ps.length * (0.6 + 0.4 * ps.length / 3), 25) : 0;
  const correct = QUIZ.filter((q, i) => ans[i] === q.a).length;
  const technical = cl(correct / QUIZ.length * 20, 20);
  const c = a.challenge || '';
  const problem = cl((c.length >= 120 ? 4 : c.length >= 40 ? 2 : 0) + (/function|def |fn |=>|fun /i.test(c) ? 3 : 0) + (/for|while|loop|two.?pointer|regex|replace|filter/i.test(c) ? 3 : 0) + (/O\(/.test(c) ? 3 : 0) + (/empty|edge|null|case/i.test(c) ? 2 : 0), 15);
  const cats = new Set(a.projects.map(p => p.category).filter(Boolean)).size, demos = a.projects.filter(p => p.demo).length;
  const creativity = cl(Math.min(cats, 3) * 2 + (a.bio.length >= 80 ? 1 : 0) + Math.min(demos, 2) * 1.5, 10);
  const experience = cl(Math.min(a.experience_years || 0, 6) + (a.previous_experience.length >= 80 ? 2 : a.previous_experience ? 1 : 0) + (a.github ? 1 : 0) + (a.portfolio ? 1 : 0), 10);
  const b = {
    'Programming skills': { pts: programming, max: 20 }, 'Project quality': { pts: project, max: 25 }, 'Technical knowledge': { pts: technical, max: 20 },
    'Problem-solving': { pts: problem, max: 15 }, 'Creativity': { pts: creativity, max: 10 }, 'Experience': { pts: experience, max: 10 }
  };
  const overall = Object.values(b).reduce((s, x) => s + x.pts, 0);
  const level = overall < 30 ? 'Beginner Developer' : overall < 50 ? 'Junior Developer' : overall < 70 ? 'Intermediate Developer' : overall < 85 ? 'Advanced Developer' : 'Expert Developer';
  const r = Object.entries(b).map(([k, v]) => [k, v.pts / v.max]).sort((x, y) => y[1] - x[1]);
  const repos = a.projects.filter(p => p.repo).length, shots = a.projects.filter(p => p.shots.length).length;
  return {
    overall, level, breakdown: b, quizCorrect: correct, quizTotal: QUIZ.length,
    strengths: r.slice(0, 2).map(x => x[0]), improvements: r.slice(-2).map(x => x[0]),
    portfolio: `${a.projects.length} project(s) submitted: ${repos} with repositories, ${demos} with live demos, ${shots} with screenshots. Contributions and links must be verified manually.`,
    recommendation: overall >= 70 ? 'Strong profile: proceed to portfolio verification and live coding challenge.' : overall >= 50 ? 'Promising profile: verify portfolio and run a practical coding challenge before deciding.' : 'Early-stage profile: administrator review required; growth guidance recommended.',
    disclaimer: 'This automated score is a rough screening signal, not proof of ability. Every applicant goes through portfolio verification, practical coding challenges and administrator review before any decision.'
  };
}
module.exports = { QUIZ, publicQuiz, assess };
