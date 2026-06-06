import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListEvents, getListEventsQueryKey, useCreateEvent, useUpdateEvent, useDeleteEvent,
  useListFundraisers, getListFundraisersQueryKey, useCreateFundraiser, useUpdateFundraiser, useDeleteFundraiser
} from "@workspace/api-client-react";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameMonth, isSameDay, addMonths, subMonths, parseISO, isToday } from "date-fns";
import { ChevronLeft, ChevronRight, MapPin, AlignLeft, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth";

const eventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  date: z.string().min(1, "Date is required"),
  type: z.enum(["meeting", "event", "other"]),
  location: z.string().optional(),
  description: z.string().optional(),
});

const fundraiserSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  goalAmount: z.coerce.number().min(1, "Goal is required"),
  raisedAmount: z.coerce.number().default(0),
  status: z.enum(["planning", "active", "completed", "cancelled"]),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
});

type EventRow = { id: number; title: string; date: string; type: string; location?: string | null; description?: string | null };
type FundraiserRow = { id: number; title: string; description?: string | null; goalAmount: number; raisedAmount: number; status: string; startDate?: string | null; endDate?: string | null };

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [isDayDetailsOpen, setIsDayDetailsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("events");

  // editing state
  const [editingEvent, setEditingEvent] = useState<EventRow | null>(null);
  const [editingFundraiser, setEditingFundraiser] = useState<FundraiserRow | null>(null);

  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: events } = useListEvents();
  const { data: fundraisers } = useListFundraisers();

  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();

  const createFundraiser = useCreateFundraiser();
  const updateFundraiser = useUpdateFundraiser();
  const deleteFundraiser = useDeleteFundraiser();

  const eventForm = useForm<z.infer<typeof eventSchema>>({
    resolver: zodResolver(eventSchema),
    defaultValues: { title: "", date: format(new Date(), "yyyy-MM-dd"), type: "meeting", location: "", description: "" }
  });

  const fundraiserForm = useForm<z.infer<typeof fundraiserSchema>>({
    resolver: zodResolver(fundraiserSchema),
    defaultValues: { title: "", description: "", goalAmount: 100, raisedAmount: 0, status: "planning", startDate: "", endDate: "" }
  });

  /* ── Event submit (create or update) ── */
  const onEventSubmit = (data: z.infer<typeof eventSchema>) => {
    if (editingEvent) {
      updateEvent.mutate({ id: editingEvent.id, data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
          toast({ title: "Event updated" });
          eventForm.reset();
          setEditingEvent(null);
          setActiveTab("events");
        }
      });
    } else {
      createEvent.mutate({ data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
          toast({ title: "Event created" });
          eventForm.reset();
          setIsDayDetailsOpen(false);
        }
      });
    }
  };

  /* ── Fundraiser submit (create or update) ── */
  const onFundraiserSubmit = (data: z.infer<typeof fundraiserSchema>) => {
    const payload = { ...data, startDate: data.startDate || undefined, endDate: data.endDate || undefined };
    if (editingFundraiser) {
      updateFundraiser.mutate({ id: editingFundraiser.id, data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListFundraisersQueryKey() });
          toast({ title: "Fundraiser updated" });
          fundraiserForm.reset();
          setEditingFundraiser(null);
          setActiveTab("events");
        }
      });
    } else {
      createFundraiser.mutate({ data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListFundraisersQueryKey() });
          toast({ title: "Fundraiser created" });
          fundraiserForm.reset();
          setIsDayDetailsOpen(false);
        }
      });
    }
  };

  /* ── Delete handlers ── */
  const handleDeleteEvent = (id: number) => {
    deleteEvent.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
        toast({ title: "Event deleted" });
      }
    });
  };

  const handleDeleteFundraiser = (id: number) => {
    deleteFundraiser.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListFundraisersQueryKey() });
        toast({ title: "Fundraiser deleted" });
      }
    });
  };

  /* ── Edit helpers ── */
  const startEditEvent = (event: EventRow) => {
    setEditingEvent(event);
    setEditingFundraiser(null);
    eventForm.reset({
      title: event.title,
      date: event.date,
      type: event.type as "meeting" | "event" | "other",
      location: event.location ?? "",
      description: event.description ?? "",
    });
    setActiveTab("add");
  };

  const startEditFundraiser = (f: FundraiserRow) => {
    setEditingFundraiser(f);
    setEditingEvent(null);
    fundraiserForm.reset({
      title: f.title,
      description: f.description ?? "",
      goalAmount: f.goalAmount,
      raisedAmount: f.raisedAmount,
      status: f.status as any,
      startDate: f.startDate ?? "",
      endDate: f.endDate ?? "",
    });
    setActiveTab("add");
  };

  const cancelEdit = () => {
    setEditingEvent(null);
    setEditingFundraiser(null);
    eventForm.reset();
    fundraiserForm.reset();
    setActiveTab("events");
  };

  /* ── Calendar helpers ── */
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const daysInMonth = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate));
    const end = endOfWeek(endOfMonth(currentDate));
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const handleDayClick = (day: Date) => {
    setSelectedDay(day);
    eventForm.setValue("date", format(day, "yyyy-MM-dd"));
    fundraiserForm.setValue("startDate", format(day, "yyyy-MM-dd"));
    setEditingEvent(null);
    setEditingFundraiser(null);
    setActiveTab("events");
    setIsDayDetailsOpen(true);
  };

  const getDayEvents = (day: Date) => (events ?? []).filter(e => isSameDay(parseISO(e.date), day));
  const getDayFundraisers = (day: Date) => (fundraisers ?? []).filter(f => {
    if (!f.startDate && !f.endDate) return false;
    const start = f.startDate ? parseISO(f.startDate) : null;
    const end = f.endDate ? parseISO(f.endDate) : null;
    if (start && end) return day >= start && day <= end;
    if (start) return isSameDay(start, day);
    if (end) return isSameDay(end, day);
    return false;
  });

  const selectedDayEvents = selectedDay ? getDayEvents(selectedDay) : [];
  const selectedDayFundraisers = selectedDay ? getDayFundraisers(selectedDay) : [];

  const getEventColor = (type: string) => {
    switch (type) {
      case "meeting": return "bg-blue-500/20 text-blue-700 border-blue-500/30 dark:text-blue-400";
      case "event": return "bg-orange-500/20 text-orange-700 border-orange-500/30 dark:text-orange-400";
      default: return "bg-green-500/20 text-green-700 border-green-500/30 dark:text-green-400";
    }
  };

  const addTabLabel = editingEvent ? "Edit Event" : editingFundraiser ? "Edit Fundraiser" : "Add New…";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-heading">Calendar & Events</h1>
          <p className="text-muted-foreground">Manage club meetings, events, and active fundraisers.</p>
        </div>
        <div className="flex gap-2 text-xs">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-500" /> Meeting</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-orange-500" /> Event</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-green-500" /> Other</div>
          <div className="flex items-center gap-1.5 ml-2"><div className="w-3 h-3 rounded-full bg-purple-500" /> Fundraiser</div>
        </div>
      </div>

      {/* ── Calendar grid ── */}
      <Card className="overflow-hidden">
        <div className="flex flex-row items-center justify-between p-4 bg-muted/30 border-b">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold font-heading w-[180px]">{format(currentDate, "MMMM yyyy")}</h2>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" onClick={prevMonth} className="h-8 w-8"><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" onClick={() => setCurrentDate(new Date())} className="h-8 px-3 text-xs">Today</Button>
              <Button variant="outline" size="icon" onClick={nextMonth} className="h-8 w-8"><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>
        <div className="p-0">
          <div className="grid grid-cols-7 border-b bg-muted/10">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
              <div key={d} className="py-3 text-center text-sm font-medium text-muted-foreground">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 auto-rows-fr bg-muted/10 gap-[1px]">
            {daysInMonth.map((day) => {
              const dayEvents = getDayEvents(day);
              const dayFundraisers = getDayFundraisers(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isTodayDate = isToday(day);
              return (
                <div
                  key={day.toString()}
                  onClick={() => handleDayClick(day)}
                  className={cn(
                    "min-h-[120px] bg-card p-2 cursor-pointer transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset",
                    !isCurrentMonth && "text-muted-foreground bg-muted/5"
                  )}
                  role="button" tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleDayClick(day); }}
                >
                  <div className={cn(
                    "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full mb-1",
                    isTodayDate && "bg-primary text-primary-foreground"
                  )}>
                    {format(day, "d")}
                  </div>
                  <div className="space-y-1 overflow-y-auto max-h-[80px] no-scrollbar">
                    {dayEvents.map(e => (
                      <div key={e.id} className={cn("text-xs px-1.5 py-0.5 rounded truncate border", getEventColor(e.type))}>{e.title}</div>
                    ))}
                    {dayFundraisers.map(f => (
                      <div key={f.id} className="text-xs px-1.5 py-0.5 rounded truncate bg-purple-500/20 text-purple-700 border border-purple-500/30 dark:text-purple-400">{f.title}</div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* ── Day detail dialog ── */}
      <Dialog open={isDayDetailsOpen} onOpenChange={(open) => { setIsDayDetailsOpen(open); if (!open) cancelEdit(); }}>
        <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedDay ? format(selectedDay, "EEEE, MMMM d, yyyy") : ""}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2 pb-4">
            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); if (v === "events") cancelEdit(); }} className="w-full">
              <TabsList className={cn("w-full", isAuthenticated ? "grid grid-cols-2" : "grid grid-cols-1")}>
                <TabsTrigger value="events">Day's Events</TabsTrigger>
                {isAuthenticated && <TabsTrigger value="add">{addTabLabel}</TabsTrigger>}
              </TabsList>

              {/* ── Events list ── */}
              <TabsContent value="events" className="mt-4 space-y-4">
                {selectedDayEvents.length === 0 && selectedDayFundraisers.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                    No events or active fundraisers on this day.
                  </div>
                ) : (
                  <>
                    {selectedDayEvents.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="font-semibold text-sm text-muted-foreground uppercase">Events & Meetings</h3>
                        {selectedDayEvents.map(event => (
                          <Card key={event.id}>
                            <CardContent className="p-4 flex gap-4 items-start">
                              <div className={cn("w-2 h-full min-h-[40px] rounded-full shrink-0", event.type === 'meeting' ? 'bg-blue-500' : event.type === 'event' ? 'bg-orange-500' : 'bg-green-500')} />
                              <div className="flex-1 min-w-0 space-y-1.5">
                                <div className="flex justify-between items-start gap-2">
                                  <h4 className="font-semibold">{event.title}</h4>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <Badge variant="outline" className="capitalize">{event.type}</Badge>
                                    {isAuthenticated && (
                                      <>
                                        <button
                                          onClick={() => startEditEvent(event)}
                                          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                          aria-label="Edit event"
                                        >
                                          <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteEvent(event.id)}
                                          disabled={deleteEvent.isPending}
                                          className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                                          aria-label="Delete event"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                                {event.location && (
                                  <div className="flex items-center text-sm text-muted-foreground gap-1.5">
                                    <MapPin className="w-3.5 h-3.5" /> {event.location}
                                  </div>
                                )}
                                {event.description && (
                                  <div className="flex items-start text-sm text-muted-foreground gap-1.5 mt-2">
                                    <AlignLeft className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                    <p>{event.description}</p>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}

                    {selectedDayFundraisers.length > 0 && (
                      <div className="space-y-3 mt-6">
                        <h3 className="font-semibold text-sm text-muted-foreground uppercase">Active Fundraisers</h3>
                        {selectedDayFundraisers.map(fundraiser => {
                          const progress = fundraiser.goalAmount > 0
                            ? Math.min((fundraiser.raisedAmount / fundraiser.goalAmount) * 100, 100)
                            : 0;
                          return (
                            <Card key={fundraiser.id} className="border-purple-200 dark:border-purple-900">
                              <CardContent className="p-4 space-y-3">
                                <div className="flex justify-between items-start gap-2">
                                  <h4 className="font-semibold text-purple-700 dark:text-purple-400">{fundraiser.title}</h4>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <Badge variant="secondary" className="capitalize">{fundraiser.status}</Badge>
                                    {isAuthenticated && (
                                      <>
                                        <button
                                          onClick={() => startEditFundraiser(fundraiser)}
                                          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                          aria-label="Edit fundraiser"
                                        >
                                          <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteFundraiser(fundraiser.id)}
                                          disabled={deleteFundraiser.isPending}
                                          className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                                          aria-label="Delete fundraiser"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                                {fundraiser.description && <p className="text-sm text-muted-foreground">{fundraiser.description}</p>}
                                <div className="space-y-1.5">
                                  <div className="flex justify-between text-sm font-medium">
                                    <span>${fundraiser.raisedAmount} raised</span>
                                    <span className="text-muted-foreground">Goal: ${fundraiser.goalAmount}</span>
                                  </div>
                                  <Progress value={progress} className="h-2 bg-purple-100 dark:bg-purple-950 [&>div]:bg-purple-500" />
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              {/* ── Add / Edit forms ── */}
              {isAuthenticated && (
                <TabsContent value="add" className="mt-4">
                  <Tabs defaultValue={editingFundraiser ? "fundraiser" : "event"} key={editingEvent?.id ?? editingFundraiser?.id ?? "new"} className="w-full">
                    {!editingEvent && !editingFundraiser && (
                      <TabsList className="w-full">
                        <TabsTrigger value="event" className="flex-1">Event / Meeting</TabsTrigger>
                        <TabsTrigger value="fundraiser" className="flex-1">Fundraiser</TabsTrigger>
                      </TabsList>
                    )}

                    <TabsContent value="event" className="mt-4">
                      {editingEvent && (
                        <p className="text-sm font-medium text-muted-foreground mb-3">Editing: <span className="text-foreground">{editingEvent.title}</span></p>
                      )}
                      <Form {...eventForm}>
                        <form onSubmit={eventForm.handleSubmit(onEventSubmit)} className="space-y-4">
                          <FormField control={eventForm.control} name="title" render={({ field }) => (
                            <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <div className="grid grid-cols-2 gap-4">
                            <FormField control={eventForm.control} name="date" render={({ field }) => (
                              <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={eventForm.control} name="type" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Type</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    <SelectItem value="meeting">Meeting</SelectItem>
                                    <SelectItem value="event">Event</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )} />
                          </div>
                          <FormField control={eventForm.control} name="location" render={({ field }) => (
                            <FormItem><FormLabel>Location</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={eventForm.control} name="description" render={({ field }) => (
                            <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} rows={3} className="resize-none" /></FormControl><FormMessage /></FormItem>
                          )} />
                          <div className="flex gap-2">
                            {editingEvent && (
                              <Button type="button" variant="outline" className="flex-1" onClick={cancelEdit}>Cancel</Button>
                            )}
                            <Button type="submit" className="flex-1" disabled={createEvent.isPending || updateEvent.isPending}>
                              {editingEvent ? "Save Changes" : "Save Event"}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </TabsContent>

                    <TabsContent value="fundraiser" className="mt-4">
                      {editingFundraiser && (
                        <p className="text-sm font-medium text-muted-foreground mb-3">Editing: <span className="text-foreground">{editingFundraiser.title}</span></p>
                      )}
                      <Form {...fundraiserForm}>
                        <form onSubmit={fundraiserForm.handleSubmit(onFundraiserSubmit)} className="space-y-4">
                          <FormField control={fundraiserForm.control} name="title" render={({ field }) => (
                            <FormItem><FormLabel>Fundraiser Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <div className="grid grid-cols-2 gap-4">
                            <FormField control={fundraiserForm.control} name="goalAmount" render={({ field }) => (
                              <FormItem><FormLabel>Goal ($)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={fundraiserForm.control} name="raisedAmount" render={({ field }) => (
                              <FormItem><FormLabel>Raised ($)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                          </div>
                          <FormField control={fundraiserForm.control} name="status" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Status</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                                <SelectContent>
                                  <SelectItem value="planning">Planning</SelectItem>
                                  <SelectItem value="active">Active</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                  <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <div className="grid grid-cols-2 gap-4">
                            <FormField control={fundraiserForm.control} name="startDate" render={({ field }) => (
                              <FormItem><FormLabel>Start Date</FormLabel><FormControl><Input type="date" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={fundraiserForm.control} name="endDate" render={({ field }) => (
                              <FormItem><FormLabel>End Date</FormLabel><FormControl><Input type="date" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                            )} />
                          </div>
                          <FormField control={fundraiserForm.control} name="description" render={({ field }) => (
                            <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} rows={3} className="resize-none" /></FormControl><FormMessage /></FormItem>
                          )} />
                          <div className="flex gap-2">
                            {editingFundraiser && (
                              <Button type="button" variant="outline" className="flex-1" onClick={cancelEdit}>Cancel</Button>
                            )}
                            <Button type="submit" className="flex-1" disabled={createFundraiser.isPending || updateFundraiser.isPending}>
                              {editingFundraiser ? "Save Changes" : "Save Fundraiser"}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </TabsContent>
                  </Tabs>
                </TabsContent>
              )}
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
