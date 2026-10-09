import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { Button } from './button';
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export function DialogContent({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <DialogPrimitive.Portal><DialogPrimitive.Overlay className="dialog-overlay"/><DialogPrimitive.Content className="dialog-content">
    <DialogPrimitive.Title>{title}</DialogPrimitive.Title><DialogPrimitive.Description>{description}</DialogPrimitive.Description>
    <DialogPrimitive.Close asChild><Button variant="ghost" className="dialog-close" aria-label="Close dialog"><X size={20}/></Button></DialogPrimitive.Close>
    {children}
  </DialogPrimitive.Content></DialogPrimitive.Portal>;
}
