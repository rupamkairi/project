import { Link } from "@tanstack/react-router";
import type { ComponentType } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

type DashboardCard = {
  title: string;
  description: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  count: number;
};

type DashboardSection = {
  title: string;
  description?: string;
  cards: DashboardCard[];
};

interface ComposeDashboardProps {
  eyebrow?: string;
  title: string;
  description: string;
  sections: DashboardSection[];
}

export function ComposeDashboard({
  eyebrow = "ProjectX",
  title,
  description,
  sections,
}: ComposeDashboardProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-10">
        <div className="mb-8 space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {eyebrow}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
        </div>

        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.title} className="space-y-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                    {section.title}
                  </h2>
                  {section.description ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {section.description}
                    </p>
                  ) : null}
                </div>
                <span className="text-xs text-muted-foreground">
                  {section.cards.length} link{section.cards.length === 1 ? "" : "s"}
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {section.cards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <Link key={card.href} to={card.href} className="block">
                      <Card className="h-full transition-colors hover:bg-accent/50">
                        <CardHeader className="space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {card.count} links
                            </span>
                          </div>
                          <div>
                            <CardTitle className="text-base">
                              {card.title}
                            </CardTitle>
                            <CardDescription className="mt-1 text-xs">
                              {card.description}
                            </CardDescription>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <p className="text-xs text-muted-foreground">
                            Open {card.href}
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
