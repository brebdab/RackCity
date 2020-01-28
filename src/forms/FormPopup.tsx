import * as React from "react";
import { Dialog, Classes } from "@blueprintjs/core";
import ModelForm, { FormTypes } from "./modelForm";
import {
  ElementType,
  ModelObject,
  ElementObjectType
} from "../components/utils";
interface FormPopupState {}
interface FormPopupProps {
  isOpen: boolean;
  type: FormTypes;
  elementName: ElementType;
  handleClose(): void;
  submitForm(model: ElementObjectType, headers: any): Promise<any>;
}

class FormPopup extends React.Component<FormPopupProps, FormPopupState> {
  render() {
    return (
      <Dialog
        className={Classes.DARK}
        usePortal={true}
        enforceFocus={true}
        canEscapeKeyClose={true}
        canOutsideClickClose={true}
        isOpen={this.props.isOpen}
        onClose={this.props.handleClose}
        title={"Add " + this.props.elementName.slice(0, -1)}
      >
        {this.props.elementName === ElementType.MODEL ? (
          <ModelForm
            type={FormTypes.CREATE}
            submitForm={this.props.submitForm}
          />
        ) : null}
      </Dialog>
    );
  }
}

export default FormPopup;
