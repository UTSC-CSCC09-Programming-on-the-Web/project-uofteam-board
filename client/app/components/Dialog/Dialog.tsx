import { Dialog as DialogRoot, type DialogProps } from "./DialogRoot";
import { DialogTitle, type DialogTitleProps } from "./DialogTitle";
import { DialogContent, type DialogContentProps } from "./DialogContent";
import { DialogFooter, type DialogFooterProps } from "./DialogFooter";
import { DialogButton, type DialogButtonProps } from "./DialogButton";

const Dialog = Object.assign(DialogRoot, {
  Title: DialogTitle,
  Content: DialogContent,
  Footer: DialogFooter,
  Button: DialogButton,
});

export {
  Dialog,
  type DialogProps,
  type DialogTitleProps,
  type DialogContentProps,
  type DialogFooterProps,
  type DialogButtonProps,
};
