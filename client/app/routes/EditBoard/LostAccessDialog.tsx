import { MdArrowBack, MdRefresh } from "react-icons/md";
import { Dialog } from "~/components";

interface LostAccessDialogProps {
  beforeConnection: boolean;
  open: boolean;
  onBack: () => void;
  onRetry: () => void;
  retrying: boolean;
}

const LostAccessDialog = ({
  beforeConnection,
  open,
  onBack,
  onRetry,
  retrying,
}: LostAccessDialogProps) => (
  <Dialog open={open}>
    <Dialog.Title>
      {beforeConnection
        ? "We're having trouble connecting to the board"
        : "Oops! The connection is down!"}
    </Dialog.Title>
    <Dialog.Content>
      {beforeConnection ? (
        <p>
          Please check your internet connection and try again. If that still does not work, please
          contact the project team.
        </p>
      ) : (
        <>
          <p>The connection might have been closed because:</p>
          <ul className="list-disc pl-5">
            <li>Your internet connection is unstable.</li>
            <li>The board was deleted.</li>
            <li>Your subscription is missing.</li>
            <li>Your access to the board was removed.</li>
          </ul>
          <p className="mt-4">To confirm, please try to reconnect below.</p>
        </>
      )}
    </Dialog.Content>
    <Dialog.Footer>
      <Dialog.Button icon={<MdArrowBack />} onClick={onBack} disabled={retrying} variant="neutral">
        Dashboard
      </Dialog.Button>
      <Dialog.Button icon={<MdRefresh />} onClick={onRetry} loading={retrying}>
        Reconnect
      </Dialog.Button>
    </Dialog.Footer>
  </Dialog>
);

export { LostAccessDialog, type LostAccessDialogProps };
