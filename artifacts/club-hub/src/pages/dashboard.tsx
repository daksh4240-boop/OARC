import { useState } from "react";
import {
  useGetDashboardStats,
  useListEvents,
  useListAnnouncements,
  useCreateAnnouncement,
  useDeleteAnnouncement,
  getListAnnouncementsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Users, Calendar as CalendarIcon, CheckSquare, ArrowRight, Megaphone, Trash2, Send } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useAuth } from "@/context/auth";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const eventTypeColors: Record<string, string> = {
  meeting: "bg-blue-100 text-blue-700",
  event: "bg-orange-100 text-orange-700",
  other: "bg-green-100 text-green-700",
  fundraiser: "bg-purple-100 text-purple-700",
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

function AnnouncementsPanel() {
  const { isAuthenticated, email } = useAuth();
  const queryClient = useQueryClient();
  const { data: announcements = [], isLoading } = useListAnnouncements();
  const createMutation = useCreateAnnouncement();
  const deleteMutation = useDeleteAnnouncement();
  const [text, setText] = useState("");

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListAnnouncementsQueryKey() });

  const handlePost = async () => {
    if (!text.trim()) return;
    await createMutation.mutateAsync({ data: { content: text.trim() } });
    setText("");
    invalidate();
  };

  const handleDelete = async (id: number) => {
    await deleteMutation.mutateAsync({ id });
    invalidate();
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
      " · " +
      d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-3">
        <Megaphone className="h-5 w-5 text-primary" />
        <CardTitle>Announcements</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Compose box — only for signed-in users */}
        {isAuthenticated && (
          <div className="flex gap-2 items-start">
            <textarea
              className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[72px]"
              placeholder="Write an announcement…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handlePost();
              }}
            />
            <Button
              size="sm"
              onClick={handlePost}
              disabled={!text.trim() || createMutation.isPending}
              className="shrink-0 mt-1"
            >
              <Send className="h-4 w-4 mr-1" />
              Post
            </Button>
          </div>
        )}

        {/* Feed */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
          </div>
        ) : announcements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
            <Megaphone className="h-8 w-8 opacity-30" />
            <p className="text-sm">No announcements yet.</p>
            {isAuthenticated && <p className="text-xs">Be the first to post one above.</p>}
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((a) => (
              <div
                key={a.id}
                className="rounded-lg border bg-muted/30 px-4 py-3 flex items-start gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground whitespace-pre-wrap break-words">{a.content}</p>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {a.authorEmail} · {formatDate(a.createdAt)}
                  </p>
                </div>
                {isAuthenticated && (
                  <button
                    onClick={() => handleDelete(a.id)}
                    disabled={deleteMutation.isPending}
                    className="shrink-0 text-muted-foreground hover:text-destructive transition-colors mt-0.5"
                    aria-label="Delete announcement"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading } = useGetDashboardStats();
  const { data: events } = useListEvents();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground font-heading">Club Overview</h1>
        <Skeleton className="h-48 w-full rounded-xl" />
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-80 w-full rounded-xl" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <motion.div
      className="space-y-8"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground font-heading">Club Overview</h1>
        <p className="text-muted-foreground">Here's what's happening in your club right now.</p>
      </div>

      {/* ── Announcements (topmost) ── */}
      <motion.div variants={item}>
        <AnnouncementsPanel />
      </motion.div>

      {/* ── Stat cards ── */}
      <motion.div variants={item} className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.totalMembers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-chart-2">{stats.upcomingEvents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-chart-4">{stats.openTasks}</div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Charts ── */}
      <div className="grid gap-4 md:grid-cols-2">
        <motion.div variants={item}>
          <Card className="col-span-1 h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle>Upcoming Events</CardTitle>
              <Link href="/calendar" className="flex items-center gap-1 text-xs text-primary hover:underline font-medium">
                View calendar <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent>
              {(() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const upcoming = (events ?? [])
                  .filter(e => new Date(e.date) >= today)
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .slice(0, 5);

                if (upcoming.length === 0) {
                  return (
                    <div className="h-[260px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                      <CalendarIcon className="h-8 w-8 opacity-30" />
                      <p className="text-sm">No upcoming events</p>
                      <Link href="/calendar" className="text-xs text-primary hover:underline">Add one in the calendar</Link>
                    </div>
                  );
                }

                return (
                  <div className="space-y-2">
                    {upcoming.map(ev => {
                      const date = new Date(ev.date + "T00:00:00");
                      const month = date.toLocaleDateString("en-US", { month: "short" });
                      const day = date.getDate();
                      return (
                        <div key={ev.id} className="flex items-center gap-3 rounded-lg border px-3 py-2.5 hover:bg-muted/40 transition-colors">
                          <div className="flex flex-col items-center justify-center w-10 shrink-0 text-center">
                            <span className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">{month}</span>
                            <span className="text-lg font-bold leading-tight text-foreground">{day}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{ev.title}</p>
                            {ev.location && <p className="text-xs text-muted-foreground truncate">{ev.location}</p>}
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize shrink-0 ${eventTypeColors[ev.type] ?? "bg-muted text-muted-foreground"}`}>
                            {ev.type}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="col-span-1 h-full">
            <CardHeader>
              <CardTitle>Tasks by Status</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              {stats.tasksByStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.tasksByStatus}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="status"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(val) => val.charAt(0).toUpperCase() + val.slice(1).replace('-', ' ')}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--muted))' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">No data available</div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
