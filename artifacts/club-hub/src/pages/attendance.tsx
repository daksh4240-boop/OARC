import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListEvents, 
  useListMembers, 
  useListAttendance, getListAttendanceQueryKey,
  useCreateAttendance, 
  useDeleteAttendance 
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

export default function Attendance() {
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  
  const { data: events, isLoading: loadingEvents } = useListEvents();
  const { data: members, isLoading: loadingMembers } = useListMembers();
  
  const { data: attendance, isLoading: loadingAttendance } = useListAttendance(
    { eventId: selectedEventId || undefined },
    { query: { enabled: !!selectedEventId, queryKey: getListAttendanceQueryKey({ eventId: selectedEventId || undefined }) } }
  );

  const queryClient = useQueryClient();
  const createAttendance = useCreateAttendance();
  const deleteAttendance = useDeleteAttendance();

  const handleToggleAttendance = (memberId: number, isAttending: boolean, existingAttendanceId?: number) => {
    if (!selectedEventId) return;

    if (isAttending) {
      createAttendance.mutate(
        { data: { eventId: selectedEventId, memberId } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListAttendanceQueryKey({ eventId: selectedEventId }) });
          }
        }
      );
    } else if (existingAttendanceId) {
      deleteAttendance.mutate(
        { id: existingAttendanceId },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListAttendanceQueryKey({ eventId: selectedEventId }) });
          }
        }
      );
    }
  };

  const attendingCount = attendance?.length || 0;
  const totalMembers = members?.length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground font-heading">Attendance</h1>
        <p className="text-muted-foreground">Track member attendance for events and meetings.</p>
      </div>

      <div className="max-w-md">
        <label className="text-sm font-medium mb-2 block">Select Event</label>
        {loadingEvents ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <Select 
            value={selectedEventId?.toString()} 
            onValueChange={(val) => setSelectedEventId(Number(val))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose an event..." />
            </SelectTrigger>
            <SelectContent>
              {events?.map(event => (
                <SelectItem key={event.id} value={event.id.toString()}>
                  {event.title} ({new Date(event.date).toLocaleDateString()})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {selectedEventId && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-4 bg-primary/10 text-primary px-4 py-3 rounded-lg border border-primary/20">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">
              {attendingCount} of {totalMembers} members present
            </span>
          </div>

          <Card>
            <CardContent className="p-0">
              {loadingMembers || loadingAttendance ? (
                <div className="p-4 space-y-4">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              ) : (
                <div className="divide-y">
                  {members?.map((member) => {
                    const record = attendance?.find(a => a.memberId === member.id);
                    const isAttending = !!record;

                    return (
                      <label 
                        key={member.id}
                        className={`flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors ${isAttending ? 'bg-primary/5' : ''}`}
                      >
                        <Checkbox 
                          checked={isAttending}
                          onCheckedChange={(checked) => handleToggleAttendance(member.id, !!checked, record?.id)}
                          data-testid={`checkbox-attendance-${member.id}`}
                        />
                        <div className="flex-1">
                          <p className="font-medium">{member.name}</p>
                          <p className="text-sm text-muted-foreground">{member.role}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
