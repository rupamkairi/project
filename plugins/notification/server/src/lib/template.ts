// Template Engine - Handlebars-based templating with variable interpolation
// Templates are stored in src/templates/email/ directory
// Variables in templates use {{variableName}} syntax

import Handlebars from "handlebars";
import { readdir, readFile, writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, "../templates/email");

// Template cache
const templateCache = new Map<string, string>();
const subjectCache = new Map<string, string>();

// Register Handlebars helpers
Handlebars.registerHelper("uppercase", (str: string) => str?.toUpperCase() || "");
Handlebars.registerHelper("lowercase", (str: string) => str?.toLowerCase() || "");
Handlebars.registerHelper("capitalize", (str: string) => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
});
Handlebars.registerHelper("date", (date: string | Date, format = "en-US") => {
  if (!date) return "";
  return new Date(date).toLocaleDateString(format);
});
Handlebars.registerHelper("time", (date: string | Date, format = "en-US") => {
  if (!date) return "";
  return new Date(date).toLocaleTimeString(format);
});
Handlebars.registerHelper("default", (value: string, fallback: string) => value || fallback);
Handlebars.registerHelper("eq", (a: unknown, b: unknown) => a === b);
Handlebars.registerHelper("ne", (a: unknown, b: unknown) => a !== b);
Handlebars.registerHelper("gt", (a: number, b: number) => a > b);
Handlebars.registerHelper("lt", (a: number, b: number) => a < b);

export interface TemplateData {
  [key: string]: unknown;
}

export function compileTemplate(template: string, data: TemplateData): string {
  const compiled = Handlebars.compile(template);
  return compiled(data);
}

export function compileSubject(subject: string, data: TemplateData): string {
  const compiled = Handlebars.compile(subject);
  return compiled(data);
}

function getTemplatePath(name: string): string {
  return join(TEMPLATES_DIR, name + ".hbs");
}

function getSubjectPath(name: string): string {
  return join(TEMPLATES_DIR, name + ".subject.hbs");
}

async function loadTemplate(name: string): Promise<string | null> {
  if (templateCache.has(name)) {
    return templateCache.get(name)!;
  }
  try {
    const content = await readFile(getTemplatePath(name), "utf-8");
    templateCache.set(name, content);
    return content;
  } catch {
    return null;
  }
}

async function loadSubjectTemplate(name: string): Promise<string | null> {
  if (subjectCache.has(name)) {
    return subjectCache.get(name)!;
  }
  try {
    const content = await readFile(getSubjectPath(name), "utf-8");
    subjectCache.set(name, content);
    return content;
  } catch {
    return null;
  }
}

export async function renderTemplate(
  name: string,
  data: TemplateData
): Promise<{ body: string; subject: string }> {
  const bodyTemplate = await loadTemplate(name);
  const subjectTemplate = await loadSubjectTemplate(name);

  if (!bodyTemplate) {
    throw new Error("Template not found: " + name);
  }

  const body = compileTemplate(bodyTemplate, data);
  const subject = subjectTemplate ? compileSubject(subjectTemplate, data) : name;

  return { body, subject };
}

export async function listTemplates(): Promise<string[]> {
  try {
    const files = await readdir(TEMPLATES_DIR);
    return files
      .filter((f) => f.endsWith(".hbs") && !f.includes(".subject."))
      .map((f) => f.replace(".hbs", ""));
  } catch {
    return [];
  }
}

export function clearCache(): void {
  templateCache.clear();
  subjectCache.clear();
}

export async function saveTemplate(
  name: string,
  body: string,
  subject?: string
): Promise<void> {
  await mkdir(TEMPLATES_DIR, { recursive: true });
  await writeFile(getTemplatePath(name), body, "utf-8");
  if (subject) {
    await writeFile(getSubjectPath(name), subject, "utf-8");
  }
  templateCache.set(name, body);
  if (subject) subjectCache.set(name, subject);
}

export async function deleteTemplate(name: string): Promise<void> {
  const { unlink } = await import("fs/promises");
  try {
    await unlink(getTemplatePath(name));
    templateCache.delete(name);
  } catch {}
  try {
    await unlink(getSubjectPath(name));
    subjectCache.delete(name);
  } catch {}
}

export default Handlebars;
