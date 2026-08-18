import type { AppState, Department, Level, Person, Tribe } from "./types";

export const SEED_VERSION = 3;

const dept = (
  id: string,
  name: string,
  color: string,
  leadId: string,
  rules: Department["rules"],
): Department => ({ id, name, color, leadId, rules });

const tribe = (id: string, name: string, departmentId: string, leadId: string): Tribe => ({
  id,
  name,
  departmentId,
  leadId,
});

type P = [
  id: string,
  name: string,
  tribeId: string,
  level: Level,
  location: string,
  skills: string[],
  isMentor: boolean,
  isReviewer: boolean,
  mentorId: string | null,
  reviewerId: string | null,
];

const p = (t: P): Person => ({
  id: t[0],
  name: t[1],
  tribeId: t[2],
  level: t[3],
  location: t[4],
  skills: t[5],
  isMentor: t[6],
  isReviewer: t[7],
  mentorId: t[8],
  reviewerId: t[9],
});

const departments: Department[] = [
  dept("dept-eng", "Engineering", "#0f6b5c", "e01", {
    mentor: {
      weights: { skill: 40, location: 15, level: 25, capacity: 20 },
      minLevelGap: 1,
      sameDepartment: true,
      maxAssigns: 4,
    },
    reviewer: {
      weights: { skill: 45, location: 10, level: 15, capacity: 30 },
      minLevelGap: 0,
      sameDepartment: false,
      maxAssigns: 8,
    },
  }),
  dept("dept-design", "Design", "#b45309", "d01", {
    mentor: {
      weights: { skill: 45, location: 15, level: 20, capacity: 20 },
      minLevelGap: 1,
      sameDepartment: false,
      maxAssigns: 3,
    },
    reviewer: {
      weights: { skill: 50, location: 10, level: 10, capacity: 30 },
      minLevelGap: 0,
      sameDepartment: false,
      maxAssigns: 8,
    },
  }),
  dept("dept-data", "Data & AI", "#0c7489", "a01", {
    mentor: {
      weights: { skill: 35, location: 20, level: 25, capacity: 20 },
      minLevelGap: 2,
      sameDepartment: true,
      maxAssigns: 5,
    },
    reviewer: {
      weights: { skill: 40, location: 15, level: 15, capacity: 30 },
      minLevelGap: 0,
      sameDepartment: false,
      maxAssigns: 8,
    },
  }),
];

const tribes: Tribe[] = [
  tribe("t-pay", "Payments", "dept-eng", "e01"),
  tribe("t-plat", "Platform", "dept-eng", "e08"),
  tribe("t-mob", "Mobile", "dept-eng", "e14"),
  tribe("t-pd", "Product Design", "dept-design", "d01"),
  tribe("t-brand", "Brand", "dept-design", "d08"),
  tribe("t-ml", "ML Platform", "dept-data", "a01"),
  tribe("t-ana", "Analytics", "dept-data", "a08"),
];

const people: Person[] = [
  // ── Engineering · Payments
  p(["e01", "Priya Sharma", "t-pay", 5, "Bengaluru", ["Go", "PostgreSQL", "System Design", "Kubernetes"], true, true, null, null]),
  p(["e02", "Arjun Mehta", "t-pay", 3, "Bengaluru", ["TypeScript", "React", "GraphQL"], false, false, "e01", "e05"]),
  p(["e03", "Sofia Petrova", "t-pay", 2, "Berlin", ["Node.js", "PostgreSQL", "CI/CD"], false, false, "e07", "e01"]),
  p(["e04", "Daniel Okafor", "t-pay", 4, "London", ["Go", "AWS", "Kubernetes"], true, true, "e01", "e10"]),
  p(["e05", "Hannah Weber", "t-pay", 4, "Berlin", ["TypeScript", "System Design", "Security"], false, true, "e01", "e04"]),
  p(["e06", "Lucas Silva", "t-pay", 1, "São Paulo", ["React", "TypeScript", "Node.js"], false, false, null, null]),
  p(["e07", "Meera Nair", "t-pay", 4, "Bengaluru", ["Go", "PostgreSQL", "CI/CD"], true, false, "e01", "e05"]),
  // ── Engineering · Platform
  p(["e08", "Tomás Rivera", "t-plat", 5, "Toronto", ["Rust", "Kubernetes", "System Design"], true, true, null, null]),
  p(["e09", "Grace Liu", "t-plat", 3, "New York", ["React", "TypeScript", "GraphQL", "CI/CD"], true, false, "e08", "e05"]),
  p(["e10", "Viktor Hansen", "t-plat", 4, "London", ["Go", "Rust", "AWS"], false, true, "e08", "e01"]),
  p(["e11", "Aisha Khan", "t-plat", 2, "Bengaluru", ["Node.js", "PostgreSQL", "CI/CD"], false, false, null, "e10"]),
  p(["e12", "Mateusz Kowalski", "t-plat", 3, "Berlin", ["Kubernetes", "AWS", "Go"], false, false, "e08", "e10"]),
  p(["e13", "Nia Douglas", "t-plat", 1, "New York", ["TypeScript", "React"], false, false, "e09", "e08"]),
  // ── Engineering · Mobile
  p(["e14", "Kenji Watanabe", "t-mob", 4, "Singapore", ["React", "TypeScript", "CI/CD"], true, false, "e08", "e10"]),
  p(["e15", "Inês Almeida", "t-mob", 2, "São Paulo", ["React", "TypeScript", "GraphQL"], false, false, "e14", "e05"]),
  p(["e16", "Owen Murphy", "t-mob", 3, "London", ["TypeScript", "Node.js", "CI/CD"], false, false, "e14", "e01"]),
  p(["e17", "Zanele Dube", "t-mob", 5, "Bengaluru", ["System Design", "Security", "Go"], false, true, null, null]),
  // ── Design · Product Design
  p(["d01", "Camille Fournier", "t-pd", 5, "Paris", ["Design Systems", "Figma", "Accessibility"], true, true, null, null]),
  p(["d02", "Ravi Patel", "t-pd", 3, "Bengaluru", ["Figma", "Prototyping", "Motion"], false, false, "d01", "d05"]),
  p(["d03", "Elsa Lindqvist", "t-pd", 4, "London", ["User Research", "Figma", "Accessibility"], true, true, "d01", "d05"]),
  p(["d04", "Marco Bianchi", "t-pd", 2, "Berlin", ["Figma", "Illustration", "Branding"], false, false, null, "d03"]),
  p(["d05", "Yuki Tanaka", "t-pd", 4, "Singapore", ["Design Systems", "Prototyping", "Figma"], true, true, "d01", "d03"]),
  p(["d06", "Amara Osei", "t-pd", 1, "London", ["Figma", "User Research"], false, false, "d03", "d01"]),
  p(["d07", "Leo Virtanen", "t-pd", 3, "Toronto", ["Motion", "Illustration", "Prototyping"], false, false, "d05", "d01"]),
  // ── Design · Brand
  p(["d08", "Noor Haddad", "t-brand", 4, "Berlin", ["Branding", "Illustration", "Motion"], true, true, "d03", "d01"]),
  p(["d09", "Felix Braun", "t-brand", 2, "Berlin", ["Branding", "Figma", "Illustration"], false, false, "d08", "d01"]),
  p(["d10", "Talia Cohen", "t-brand", 3, "New York", ["Branding", "Motion", "Accessibility"], false, false, "d08", "d03"]),
  p(["d11", "June Park", "t-brand", 1, "Singapore", ["Illustration", "Figma"], false, false, null, "d08"]),
  // ── Data & AI · ML Platform
  p(["a01", "Dmitri Volkov", "t-ml", 5, "Berlin", ["Python", "MLOps", "Spark", "LLMs"], true, true, null, null]),
  p(["a02", "Fatima Zahra", "t-ml", 3, "Toronto", ["Python", "LLMs", "Airflow"], false, false, "a01", "a06"]),
  p(["a03", "Samuel Mensah", "t-ml", 4, "London", ["Spark", "Kafka", "Airflow"], true, true, "a01", "a06"]),
  p(["a04", "Hana Kobayashi", "t-ml", 2, "Singapore", ["Python", "SQL", "dbt"], false, false, null, "a03"]),
  p(["a05", "Piotr Nowak", "t-ml", 3, "Berlin", ["MLOps", "Python", "Kafka"], false, false, "a01", "a03"]),
  p(["a06", "Alice Beaumont", "t-ml", 4, "Paris", ["LLMs", "Python", "Statistics"], false, true, "a01", "a03"]),
  p(["a07", "Omar Fadel", "t-ml", 1, "New York", ["SQL", "Python", "Statistics"], false, false, "a03", "a06"]),
  // ── Data & AI · Analytics
  p(["a08", "Beatriz Costa", "t-ana", 4, "São Paulo", ["dbt", "SQL", "Looker", "Statistics"], true, true, "a01", "a06"]),
  p(["a09", "Noah Fischer", "t-ana", 3, "Berlin", ["SQL", "Looker", "Airflow"], false, false, "a11", "a03"]),
  p(["a10", "Ivy Chen", "t-ana", 2, "Toronto", ["SQL", "dbt", "Statistics"], false, false, "a08", "a11"]),
  p(["a11", "Kwame Boateng", "t-ana", 5, "London", ["Spark", "SQL", "Statistics"], true, true, null, null]),
  p(["a12", "Léa Moreau", "t-ana", 1, "Paris", ["SQL", "Looker"], false, false, null, "a08"]),
];

export function seedState(): AppState {
  return {
    version: SEED_VERSION,
    departments,
    tribes,
    people,
    activity: [
      { id: "act-3", ts: Date.now() - 1000 * 60 * 42, text: "Beatriz Costa took Ivy Chen as mentee", tone: "success" },
      { id: "act-2", ts: Date.now() - 1000 * 60 * 130, text: "Data & AI raised mentor level gap to +2", tone: "info" },
      { id: "act-1", ts: Date.now() - 1000 * 60 * 300, text: "Noor Haddad was activated as a mentor", tone: "success" },
    ],
  };
}
