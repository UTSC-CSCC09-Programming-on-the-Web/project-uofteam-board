import { Dialog } from "~/components";

interface HelpDialogProps {
  open: boolean;
  onClose: () => void;
}

function HelpDialog({ open, onClose }: HelpDialogProps) {
  return (
    <Dialog open={open} onClose={onClose}>
      <Dialog.Title>Help</Dialog.Title>
      <Dialog.Content>
        <span>
          This is a collaborative drawing board. You can draw paths, circles, rectangles, etc.,
          using the toolbar to customize/select your desired tool.
        </span>
        <br />
        <br />
        You can use your mouse wheel to zoom in and out on the board. You can also hold the spacebar
        and drag to pan around the board.
      </Dialog.Content>
      <Dialog.Footer>
        <Dialog.Button onClick={onClose} size="sm">
          Close
        </Dialog.Button>
      </Dialog.Footer>
    </Dialog>
  );
}

export { HelpDialog, type HelpDialogProps };
