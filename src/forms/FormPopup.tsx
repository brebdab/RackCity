import { Classes, Dialog } from "@blueprintjs/core";
import * as React from "react";
import {
  ElementObjectType,
  ElementType,
  isInstanceObject,
  isModelObject
} from "../components/utils";
import InstanceForm from "./InstanceForm";
import ModelForm, { FormTypes } from "./modelForm";
interface FormPopupState {}
interface FormPopupProps {
  isOpen: boolean;
  type: FormTypes;
  initialValues?: ElementObjectType;
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
            initialValues={
              isModelObject(this.props.initialValues)
                ? this.props.initialValues
                : undefined
            }
          />
        ) : (
          <InstanceForm
            type={FormTypes.CREATE}
            submitForm={this.props.submitForm}
            initialValues={
              isInstanceObject(this.props.initialValues)
                ? this.props.initialValues
                : undefined
            }
          />
        )}
      </Dialog>
    );
  }
}

export default FormPopup;
