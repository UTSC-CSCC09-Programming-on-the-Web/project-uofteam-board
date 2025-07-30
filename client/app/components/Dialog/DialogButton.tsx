import { Button, type ButtonProps } from "../Button";

type DialogButtonProps = ButtonProps;

const DialogButton = (props: DialogButtonProps) => <Button {...props} />;

export { DialogButton, type DialogButtonProps };
