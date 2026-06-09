import { useState } from 'react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import API from '../../api/axios';

// Wrap each task row with sortable behaviour
export function SortableItem({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} className="relative group/sortable">
      {/* Drag handle overlay — sits on top of the grip icon area */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-0 top-0 h-full w-10 cursor-grab active:cursor-grabbing z-10"
        onClick={e => e.stopPropagation()}
      />
      {children}
    </div>
  );
}

// DndContext wrapper for a list of tasks within one status group
export function SortableTaskList({ tasks, onReorder, children }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [activeId, setActiveId] = useState(null);

  function handleDragStart({ active }) {
    setActiveId(active.id);
  }

  async function handleDragEnd({ active, over }) {
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const oldIdx = tasks.findIndex(t => t._id === active.id);
    const newIdx = tasks.findIndex(t => t._id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;

    const original = [...tasks];
    const reordered = arrayMove(tasks, oldIdx, newIdx);
    onReorder(reordered);

    try {
      const updates = reordered.map((t, i) => ({ id: t._id, status: t.status, order: i }));
      await API.patch('/tasks/reorder', { updates });
    } catch {
      onReorder(original);
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <SortableContext items={tasks.map(t => t._id)} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}
