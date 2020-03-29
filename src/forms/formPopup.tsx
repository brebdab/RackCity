import { Classes, Dialog } from "@blueprintjs/core";
import * as React from "react";
import {
  ElementObjectType,
  ElementType,
  isAssetObject,
  isModelObject,
  FormObjectType,
  isDatacenterObject,
  DatacenterObject,
  isChangePlanObject
} from "../utils/utils";
import { ALL_DATACENTERS } from "../components/elementView/elementTabContainer";
import RackSelectView from "../components/elementView/rackSelectView";
import AssetForm from "./assetForm";
import ModelForm from "./modelForm";
import DatacenterForm from "./datacenterForm";
import WrappedRegistrationForm from "./auth/register";
import { FormTypes } from "./formUtils";
import ChangePlanForm from "./changePlanForm";
import UserForm from "./userForm";

interface FormPopupState { }
interface FormPopupProps {
  isOpen: boolean;
  type: FormTypes;
  loading?: boolean;
  datacenters?: Array<DatacenterObject>;
  currDatacenter?: DatacenterObject;
  initialValues?: ElementObjectType;
  userId?: string;
  elementName: ElementType;
  handleClose(): void;
  submitForm(element: FormObjectType, headers: any): Promise<any> | void;
}

var console: any = {};
console.log = function () { };
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
        {this.props.elementName === ElementType.ASSET ? (
          <AssetForm
            datacenters={this.props.datacenters ? this.props.datacenters : []}
            currDatacenter={
              this.props.currDatacenter
                ? this.props.currDatacenter
                : ALL_DATACENTERS
            }
            isOpen={this.props.isOpen}
            type={FormTypes.CREATE}
            submitForm={this.props.submitForm}
            initialValues={
              isAssetObject(this.props.initialValues)
                ? this.props.initialValues
                : undefined
            }
          />
        ) : null}
        {this.props.elementName === ElementType.RACK ? (
          <RackSelectView
            loading={this.props.loading}
            submitForm={this.props.submitForm}
          />
        ) : null}
        {this.props.elementName === ElementType.USER && !this.props.userId ? (
          <WrappedRegistrationForm authSignup={this.props.submitForm} />
        ) : null}
        {this.props.elementName === ElementType.DATACENTER ? (
          <DatacenterForm
            type={FormTypes.CREATE}
            submitForm={this.props.submitForm}
            initialValues={
              isDatacenterObject(this.props.initialValues)
                ? this.props.initialValues
                : undefined
            }
          />
        ) : null}
        {this.props.elementName === ElementType.CHANGEPLANS ? (
          <ChangePlanForm
            submitForm={this.props.submitForm}
            initialValues={
              isChangePlanObject(this.props.initialValues)
                ? this.props.initialValues
                : undefined
            }
          />
        ) : null}
        {this.props.elementName === ElementType.USER && this.props.userId ? (
          <UserForm
            userId={this.props.userId} // change to dynamic id
            submitForm={() => {
              this.props.submitForm({} as FormObjectType, {});
            }}
          />
        ) : null}
      </Dialog>
    );
  }
}

export default FormPopup;
