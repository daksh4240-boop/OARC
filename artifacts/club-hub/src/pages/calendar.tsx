import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListEvents, getListEventsQueryKey, useCreateEvent, useUpdateEvent, useDeleteEvent,
  useListFundraisers, getListFundraisersQueryKey, useCreateFundraiser, useUpdateFundraiser, useDeleteFundraiser
} from "@workspace/api-client-react";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameMonth, isSameDay, addMonths, subMonths, parseISO, isToday } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, MapPin, AlignLeft, Info, Calendar as CalendarIcon, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
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

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [isDayDetailsOpen, setIsDayDetailsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("events");

  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: events } = useListEvents();
  const { data: fundraisers } = useListFundraisers();

  const createEvent = useCreateEvent();
  const createFundraiser = useCreateFundraiser();

  const eventForm = useForm<z.infer<typeof eventSchema>>({
    resolver: zodResolver(eventSchema),
    defaultValues: { title: "", date: format(new Date(), "yyyy-MM-dd"), type: "meeting", location: "", description: "" }
  });

  const fundraiserForm = useForm<z.infer<typeof fundraiserSchema>>({
    resolver: zodResolver(fundraiserSchema),
    defaultValues: { title: "", description: "", goalAmount: 100, raisedAmount: 0, status: "planning", startDate: "", endDate: "" }
  });

  const onEventSubmit = (data: z.infer<typeof eventSchema>) => {
    createEvent.mutate({ data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
        toast({ title: "Event created successfully" });
        eventForm.reset();
        setIsDayDetailsOpen(false);
      }
    });
  };

  const onFundraiserSubmit = (data: z.infer<typeof fundraiserSchema>) => {
    const payload = {
      ...data,
      startDate: data.startDate || undefined,
      endDate: data.endDate || undefined,
    };
    createFundraiser.mutate({ data: payload }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListFundraisersQueryKey() });
        toast({ title: "Fundraiser created successfully" });
        fundraiserForm.reset();
        setIsDayDetailsOpen(false);
      }
    });
  };

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
    setIsDayDetailsOpen(true);
  };

  const getDayEvents = (day: Date) => {
    if (!events) return [];
    return events.filter(e => isSameDay(parseISO(e.date), day));
  };

  const getDayFundraisers = (day: Date) => {
    if (!fundraisers) return [];
    return fundraisers.filter(f => {
      if (!f.startDate && !f.endDate) return false;
      const start = f.startDate ? parseISO(f.startDate) : null;
      const end = f.endDate ? parseISO(f.endDate) : null;
      if (start && end) return day >= start && day <= end;
      if (start) return isSameDay(start, day);
      if (end) return isSameDay(end, day);
      return false;
    });
  };

  const selectedDayEvents = selectedDay ? getDayEvents(selectedDay) : [];
  const selectedDayFundraisers = selectedDay ? getDayFundraisers(selectedDay) : [];

  const getEventColor = (type: string) => {
    switch (type) {
      case "meeting": return "bg-blue-500/20 text-blue-700 border-blue-500/30 dark:text-blue-400";
      case "event": return "bg-orange-500/20 text-orange-700 border-orange-500/30 dark:text-orange-400";
      default: return "bg-green-500/20 text-green-700 border-green-500/30 dark:text-green-400";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-heading">Calendar & Events</h1>
          <p className="text-muted-foreground">Manage club meetings, events, and active fundraisers.</p>
        </div>
        
        <div className="flex gap-2 text-xs">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-500"></div> Meeting</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-orange-500"></div> Event</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-green-500"></div> Other</div>
          <div className="flex items-center gap-1.5 ml-2"><div className="w-3 h-3 rounded-full bg-purple-500"></div> Fundraiser</div>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between p-4 bg-muted/30 border-b">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold font-heading w-[180px]">
              {format(currentDate, "MMMM yyyy")}
            </h2>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" onClick={prevMonth} className="h-8 w-8">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => setCurrentDate(new Date())} className="h-8 px-3 text-xs">
                Today
              </Button>
              <Button variant="outline" size="icon" onClick={nextMonth} className="h-8 w-8">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-7 border-b bg-muted/10">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="py-3 text-center text-sm font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 auto-rows-fr bg-muted/10 gap-[1px]">
            {daysInMonth.map((day, idx) => {
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
                    !isCurrentMonth && "text-muted-foreground bg-muted/5",
                  )}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') handleDayClick(day);
                  }}
                >
                  <div className={cn(
                    "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full mb-1",
                    isTodayDate && "bg-primary text-primary-foreground"
                  )}>
                    {format(day, "d")}
                  </div>
                  <div className="space-y-1 overflow-y-auto max-h-[80px] no-scrollbar">
                    {dayEvents.map(e => (
                      <div key={e.id} className={cn("text-xs px-1.5 py-0.5 rounded truncate border", getEventColor(e.type))}>
                        {e.title}
                      </div>
                    ))}
                    {dayFundraisers.map(f => (
                      <div key={f.id} className="text-xs px-1.5 py-0.5 rounded truncate bg-purple-500/20 text-purple-700 border border-purple-500/30 dark:text-purple-400">
                        {f.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDayDetailsOpen} onOpenChange={setIsDayDetailsOpen}>
        <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedDay ? format(selectedDay, "EEEE, MMMM d, yyyy") : ""}</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto pr-2 pb-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className={cn("w-full", isAuthenticated ? "grid grid-cols-2" : "grid grid-cols-1")}>
                <TabsTrigger value="events">Day's Events</TabsTrigger>
                {isAuthenticated && <TabsTrigger value="add">Add New...</TabsTrigger>}
              </TabsList>
              
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
                              <div className={cn("w-2 h-full min-h-[40px] rounded-full", event.type === 'meeting' ? 'bg-blue-500' : event.type === 'event' ? 'bg-orange-500' : 'bg-green-500')} />
                              <div className="flex-1 space-y-1.5">
                                <div className="flex justify-between items-start">
                                  <h4 className="font-semibold">{event.title}</h4>
                                  <Badge variant="outline" className="capitalize">{event.type}</Badge>
                                </div>
                                {event.location && (
                                  <div className="flex items-center text-sm text-muted-foreground gap-1.5">
                                    <MapPin className="w-3.5 h-3.5" /> {event.location}
                                  </div>
                                )}
                                {event.description && (
                                  <div className="flex items-start text-sm text-muted-foreground gap-1.5 mt-2">
                                    <AlignLeft className="w-3.5 h-3.5 mt-0.5" />
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
                                <div className="flex justify-between items-start">
                                  <h4 className="font-semibold text-purple-700 dark:text-purple-400">{fundraiser.title}</h4>
                                  <Badge variant="secondary" className="capitalize">{fundraiser.status}</Badge>
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
              
              <TabsContent value="add" className="mt-4">
                <Tabs defaultValue="event" className="w-full">
                  <TabsList className="w-full">
                    <TabsTrigger value="event" className="flex-1">Event / Meeting</TabsTrigger>
                    <TabsTrigger value="fundraiser" className="flex-1">Fundraiser</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="event" className="mt-4">
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
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                        <Button type="submit" className="w-full" disabled={createEvent.isPending}>Save Event</Button>
                      </form>
                    </Form>
                  </TabsContent>
                  
                  <TabsContent value="fundraiser" className="mt-4">
                    <Form {...fundraiserForm}>
                      <form onSubmit={fundraiserForm.handleSubmit(onFundraiserSubmit)} className="space-y-4">
                        <FormField control={fundraiserForm.control} name="title" render={({ field }) => (
                          <FormItem><FormLabel>Fundraiser Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={fundraiserForm.control} name="goalAmount" render={({ field }) => (
                            <FormItem><FormLabel>Goal Amount ($)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={fundraiserForm.control} name="status" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Status</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                        </div>
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
                        <Button type="submit" className="w-full" disabled={createFundraiser.isPending}>Save Fundraiser</Button>
                      </form>
                    </Form>
                  </TabsContent>
                </Tabs>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
