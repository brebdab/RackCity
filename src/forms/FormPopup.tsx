import { Classes, Dialog } from "@blueprintjs/core";
import * as React from "react";
import {
  ElementObjectType,
  ElementType,
  isInstanceObject,
  isModelObject,
  FormObjectType
} from "../components/utils";
import RackSelectView from "../components/elementView/rackSelectView";
import InstanceForm from "./InstanceForm";
import ModelForm from "./modelForm";
import { FormTypes } from "./formUtils";
interface FormPopupState {}
interface FormPopupProps {
  isOpen: boolean;
  type: FormTypes;
  initialValues?: ElementObjectType;
  elementName: ElementType;
  handleClose(): void;
  submitForm(model: FormObjectType, headers: any): Promise<any> | void;
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
        title={this.props.type + " " + this.props.elementName.slice(0, -1)}
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
        ) : null}
        {this.props.elementName === ElementType.INSTANCE ? (
          <InstanceForm
            type={FormTypes.CREATE}
            submitForm={this.props.submitForm}
            initialValues={
              isInstanceObject(this.props.initialValues)
                ? this.props.initialValues
                : undefined
            }
          />
        ) : null}
        {this.props.elementName === ElementType.RACK ? (
          <RackSelectView submitForm={this.props.submitForm} />
        ) : null}
      </Dialog>
    );
  }
}

export default FormPopup;
