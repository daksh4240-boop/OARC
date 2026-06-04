import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListTasks, getListTasksQueryKey, 
  useCreateTask, useUpdateTask, useDeleteTask,
  useListMembers 
} from "@workspace/api-client-react";
import { Plus, Search, MoreVertical, Calendar, User as UserIcon, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
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
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Textarea } from "@/components/ui/textarea";

const taskStatuses = ["todo", "in-progress", "done"];
const priorities = ["low", "medium", "high"];

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.string().min(1, "Status is required"),
  priority: z.string().min(1, "Priority is required"),
  assignedTo: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

export default function Tasks() {
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
      assignedTo: data.assignedTo && data.assignedTo !== "unassigned" ? Number(data.assignedTo) : undefined,
      dueDate: data.dueDate || undefined,
    };

    if (editingTask) {
      updateTask.mutate(
        { id: editingTask.id, data: payload },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
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

  const tasksByStatus = useMemo(() => {
    const grouped = {
      todo: filteredTasks.filter(t => t.status === "todo"),
      "in-progress": filteredTasks.filter(t => t.status === "in-progress"),
      done: filteredTasks.filter(t => t.status === "done"),
    };
    return grouped;
  }, [filteredTasks]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "outline";
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-heading">Tasks</h1>
          <p className="text-muted-foreground">Manage to-dos, priorities, and assignments.</p>
        </div>
        <Dialog open={isAddOpen || !!editingTask} onOpenChange={(open) => {
          if (!open) {
            setIsAddOpen(false);
            setEditingTask(null);
            form.reset({ title: "", description: "", status: "todo", priority: "medium", assignedTo: "", dueDate: "" });
          } else {
            setIsAddOpen(true);
          }
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-task">
              <Plus className="w-4 h-4 mr-2" /> Add Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTask ? "Edit Task" : "Add Task"}</DialogTitle>
            </DialogHeader>
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Priority" />
                            </SelectTrigger>
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
                        <Select onValueChange={field.onChange} defaultValue={field.value || "unassigned"}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Unassigned" />
                            </SelectTrigger>
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
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={createTask.isPending || updateTask.isPending} data-testid="button-save-task">
                    Save Task
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-4 items-center mb-4">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]">
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
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loadingTasks || loadingMembers ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-muted/30 rounded-xl p-4 space-y-4">
              <Skeleton className="h-6 w-24" />
              {[...Array(3)].map((_, j) => <Skeleton key={j} className="h-32 w-full" />)}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 items-start">
          {["todo", "in-progress", "done"].map((statusStr) => {
            const statusKey = statusStr as keyof typeof tasksByStatus;
            const columnTasks = tasksByStatus[statusKey] || [];
            
            return (
              <div key={statusKey} className="bg-muted/30 rounded-xl p-4 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                    {statusKey.replace("-", " ")}
                  </h3>
                  <Badge variant="secondary">{columnTasks.length}</Badge>
                </div>
                
                <div className="flex flex-col gap-3">
                  {columnTasks.map((task, i) => {
                    const assignee = members?.find(m => m.id === task.assignedTo);
                    
                    return (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <Card className="hover:shadow-md transition-shadow">
                          <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
                            <div className="space-y-1">
                              <CardTitle className="text-base">{task.title}</CardTitle>
                              {task.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
                              )}
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="-mt-2 -mr-2 h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
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
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </CardHeader>
                          <CardFooter className="p-4 pt-0 flex flex-wrap gap-2 justify-between items-center">
                            <div className="flex gap-2">
                              <Badge variant={getPriorityColor(task.priority) as any} className="capitalize text-[10px]">
                                {task.priority}
                              </Badge>
                            </div>
                            <div className="flex gap-3 text-xs text-muted-foreground items-center">
                              {task.dueDate && (
                                <div className="flex items-center gap-1" title="Due date">
                                  <Calendar className="h-3 w-3" />
                                  <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                                </div>
                              )}
                              {assignee && (
                                <div className="flex items-center gap-1" title={`Assigned to ${assignee.name}`}>
                                  <UserIcon className="h-3 w-3" />
                                  <span className="truncate max-w-[80px]">{assignee.name.split(' ')[0]}</span>
                                </div>
                              )}
                            </div>
                          </CardFooter>
                        </Card>
                      </motion.div>
                    );
                  })}
                  {columnTasks.length === 0 && (
                    <div className="text-center py-8 text-sm text-muted-foreground border-2 border-dashed rounded-lg border-muted">
                      No tasks
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

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
