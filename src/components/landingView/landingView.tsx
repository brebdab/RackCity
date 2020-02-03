import {
  Classes,
  AnchorButton,
  IToastProps,
  Toaster,
  Position,
  Intent
} from "@blueprintjs/core";
import * as React from "react";
import ElementTabView from "../elementView/elementTabView";
import RackSelectView, { RackRangeFields } from "../elementView/rackSelectView";
import { API_ROOT } from "../../api-config";
import axios from "axios";
import { RouteComponentProps, withRouter } from "react-router";
import FormPopup from "../../forms/FormPopup";

import { ElementType, getHeaders } from "../utils";
import { connect } from "react-redux";
import { FormTypes } from "../../forms/formUtils";

interface LandingViewState {
  isOpen: boolean;
  isDeleteOpen: boolean;
}
interface LandingViewProps {
  token: string;
  isAdmin: boolean;
}
class LandingView extends React.Component<
  RouteComponentProps & LandingViewProps,
  LandingViewState
> {
  viewRackForm = (rack: RackRangeFields, headers: any) => {
    return axios.post(API_ROOT + "api/racks/get", rack, headers).then(res => {
      this.props.history.replace("/racks", res.data.racks);
      this.props.history.push({
        pathname: "/racks",
        state: res.data.racks
      });
    });
  };
  state = {
    isOpen: false,
    isDeleteOpen: false
  };
  private handleOpen = () => {
    this.setState({
      isOpen: true
    });
    console.log(this.state);
  };
  deleteRack = (rack: RackRangeFields, headers: any) => {
    return axios
      .post(API_ROOT + "api/racks/delete", rack, headers)
      .then(res => {
        this.addToast({
          message: "Deleted rack(s) successfully",
          intent: Intent.PRIMARY
        });
        this.setState({ isDeleteOpen: false });
      });
  };

  createRack = (rack: RackRangeFields, headers: any) => {
    return axios
      .post(API_ROOT + "api/racks/create", rack, headers)
      .then(res => {
        this.setState({ isOpen: false });
        this.addToast({
          message: "Created rack(s) successfully",
          intent: Intent.PRIMARY
        });
      });
  };
  private addToast(toast: IToastProps) {
    toast.timeout = 5000;
    this.toaster.show(toast);
  }
  private toaster: Toaster = {} as Toaster;
  private refHandlers = {
    toaster: (ref: Toaster) => (this.toaster = ref)
  };

  private handleDeleteCancel = () => this.setState({ isDeleteOpen: false });
  private handleDeleteOpen = () => this.setState({ isDeleteOpen: true });
  private handleClose = () => this.setState({ isOpen: false });

  public render() {
    return (
      <div className={Classes.DARK}>
        <Toaster
          autoFocus={false}
          canEscapeKeyClear={true}
          position={Position.TOP}
          ref={this.refHandlers.toaster}
        />

        <AnchorButton
          className="add-rack-button"
          text={"Add Rack"}
          icon="add"
          onClick={this.handleOpen}
        />
        <AnchorButton
          className="delete-rack-button"
          text={"Delete Rack"}
          icon="trash"
          onClick={this.handleDeleteOpen}
        />
        <FormPopup
          type={FormTypes.CREATE}
          elementName={ElementType.RACK}
          submitForm={this.createRack}
          isOpen={this.state.isOpen}
          handleClose={this.handleClose}
        />
        <FormPopup
          type={FormTypes.DELETE}
          elementName={ElementType.RACK}
          submitForm={this.deleteRack}
          isOpen={this.state.isDeleteOpen}
          handleClose={this.handleDeleteCancel}
        />
        <RackSelectView submitForm={this.viewRackForm} />
        <ElementTabView />
      </div>
    );
  }
}

const mapStatetoProps = (state: any) => {
  return {
    token: state.token,
    isAdmin: state.admin
  };
};
export default connect(mapStatetoProps)(withRouter(LandingView));
