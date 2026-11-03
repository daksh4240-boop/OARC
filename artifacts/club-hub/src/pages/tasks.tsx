import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  getGetDashboardStatsQueryKey,
  useListTasks, getListTasksQueryKey, 
  useCreateTask, useUpdateTask, useDeleteTask,
  useListMembers 
} from "@workspace/api-client-react";
import { Plus, MoreVertical, Calendar, User as UserIcon, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/auth";

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.string().min(1, "Status is required"),
  priority: z.string().min(1, "Priority is required"),
  assignedTo: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

const statusColors: Record<string, string> = {
  "todo": "bg-muted text-muted-foreground",
  "in-progress": "bg-blue-100 text-blue-700",
  "done": "bg-green-100 text-green-700",
};

const priorityColors: Record<string, string> = {
  "high": "bg-red-100 text-red-700",
  "medium": "bg-amber-100 text-amber-700",
  "low": "bg-slate-100 text-slate-600",
};

export default function Tasks() {
  const { isAuthenticated } = useAuth();
  const { data: tasks, isLoading: loadingTasks } = useListTasks();
  const { data: members, isLoading: loadingMembers } = useListMembers();
  
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [deletingTask, setDeletingTask] = useState<any>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      assignedTo: "",
      dueDate: "",
    },
  });

  const onSubmit = (data: TaskFormValues) => {
    const payload = {
      ...data,
      assignedTo: data.assignedTo && data.assignedTo !== "unassigned" ? Number(data.assignedTo) : null,
      dueDate: data.dueDate || null,
    };

    if (editingTask) {
      updateTask.mutate(
        { id: editingTask.id, data: payload },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
            toast({ title: "Task updated successfully" });
            setEditingTask(null);
            form.reset();
          },
        }
      );
    } else {
      createTask.mutate(
        { data: payload },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
            toast({ title: "Task added successfully" });
            setIsAddOpen(false);
            form.reset();
          },
        }
      );
    }
  };

  const handleDelete = () => {
    if (!deletingTask) return;
    deleteTask.mutate(
      { id: deletingTask.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
          toast({ title: "Task deleted successfully" });
          setDeletingTask(null);
        },
      }
    );
  };

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    return tasks.filter(t => {
      if (filterStatus !== "all" && t.status !== filterStatus) return false;
      if (filterPriority !== "all" && t.priority !== filterPriority) return false;
      return true;
    });
  }, [tasks, filterStatus, filterPriority]);

  const TaskForm = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl><Input {...field} data-testid="input-task-title" /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea {...field} className="resize-none" rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="todo">Todo</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="assignedTo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assigned To</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || "unassigned"}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {members?.map(m => (
                      <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={createTask.isPending || updateTask.isPending} data-testid="button-save-task">
            Save Task
          </Button>
        </div>
      </form>
    </Form>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-heading">Tasks</h1>
          <p className="text-muted-foreground">Manage to-dos, priorities, and assignments.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={(open) => {
          setIsAddOpen(open);
          if (!open) form.reset({ title: "", description: "", status: "todo", priority: "medium", assignedTo: "", dueDate: "" });
        }}>
          {isAuthenticated && (
            <DialogTrigger asChild>
              <Button data-testid="button-add-task">
                <Plus className="w-4 h-4 mr-2" /> Add Task
              </Button>
            </DialogTrigger>
          )}
          <DialogContent>
            <DialogHeader><DialogTitle>Add Task</DialogTitle></DialogHeader>
            {TaskForm}
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]" data-testid="select-filter-status">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="todo">Todo</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[150px]" data-testid="select-filter-priority">
            <SelectValue placeholder="All Priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        {filteredTasks.length > 0 && (
          <span className="text-sm text-muted-foreground self-center">{filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}</span>
        )}
      </div>

      {/* Vertical Task List */}
      {loadingTasks || loadingMembers ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground border-2 border-dashed rounded-xl">
          <p className="text-sm">No tasks yet. Add one to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task, i) => {
            const assignee = members?.find(m => m.id === task.assignedTo);
            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                data-testid={`task-row-${task.id}`}
              >
                <div className="flex items-center gap-4 rounded-xl border bg-card px-5 py-4 hover:shadow-sm transition-shadow">
                  {/* Priority dot */}
                  <div className={`w-2 h-2 rounded-full shrink-0 ${task.priority === "high" ? "bg-red-500" : task.priority === "medium" ? "bg-amber-400" : "bg-slate-300"}`} />

                  {/* Title + description */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm ${task.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{task.description}</p>
                    )}
                  </div>

                  {/* Meta badges */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColors[task.status] ?? "bg-muted text-muted-foreground"}`}>
                      {task.status.replace("-", " ")}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${priorityColors[task.priority] ?? ""}`}>
                      {task.priority}
                    </span>
                    {assignee && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <UserIcon className="h-3 w-3" />
                        <span className="hidden sm:inline">{assignee.name.split(" ")[0]}</span>
                      </div>
                    )}
                    {task.dueDate && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span className="hidden sm:inline">{new Date(task.dueDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {isAuthenticated ? (
                        <>
                          <DropdownMenuItem onClick={() => {
                            form.reset({
                              title: task.title,
                              description: task.description || "",
                              status: task.status,
                              priority: task.priority,
                              assignedTo: task.assignedTo ? task.assignedTo.toString() : "unassigned",
                              dueDate: task.dueDate || "",
                            });
                            setEditingTask(task);
                          }}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeletingTask(task)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <DropdownMenuItem disabled>Sign in to edit</DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editingTask} onOpenChange={(open) => {
        if (!open) { setEditingTask(null); form.reset(); }
      }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Task</DialogTitle></DialogHeader>
          {TaskForm}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingTask} onOpenChange={(open) => !open && setDeletingTask(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingTask?.title}"? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
