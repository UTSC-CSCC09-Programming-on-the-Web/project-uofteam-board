import { Button, type ButtonProps } from "../Button";

type DialogButtonProps = ButtonProps;

function DialogButton(props: DialogButtonProps) {
  return <Button {...props} />;
}

export { DialogButton, type DialogButtonProps };
