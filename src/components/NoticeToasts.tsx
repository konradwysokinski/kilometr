import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useStore } from '../app/store';
import { NoticeCard } from './NoticeCard';

const DURATION = 10_000;

/**
 * Shows each new notice once as a toast. When it closes (by hand or on its
 * own) it is marked as toasted and lives on in the notifications list.
 * Mounted inside the router so the action can navigate.
 */
export function NoticeToasts() {
  const { notices, markToasted } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    for (const n of notices) {
      if (n.toasted) continue;
      // A stable id means StrictMode's double effect updates instead of duplicating.
      toast.custom(
        (id) => (
          <NoticeCard
            notice={n}
            onAction={() => {
              toast.dismiss(id);
              markToasted(n.id);
              navigate('/activities');
            }}
            onClose={() => {
              toast.dismiss(id);
              markToasted(n.id);
            }}
          />
        ),
        { id: n.id, duration: DURATION, onAutoClose: () => markToasted(n.id), onDismiss: () => markToasted(n.id) },
      );
    }
  }, [notices, markToasted, navigate]);

  return null;
}
