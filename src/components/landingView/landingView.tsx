import {
  AnchorButton,
  Card,
  Classes,
  Intent,
  IToastProps,
  Position,
  Toaster,
  Alert
} from "@blueprintjs/core";
import axios from "axios";
import * as React from "react";
import { connect } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router";
import { API_ROOT } from "../../utils/api-config";

import { FormTypes } from "../../forms/formUtils";
import ElementTabContainer from "../elementView/elementTabContainer";
import RackSelectView from "../elementView/rackSelectView";
import { ElementType, RackRangeFields } from "../../utils/utils";
import FormPopup from "../../forms/formPopup";

var console: any = {};
console.log = function() {};
interface LandingViewState {
  isOpen: boolean;
  isDeleteOpen: boolean;
  deleteRackInfo: RackRangeFields;
  headers: any;
  isConfirmationOpen: boolean;
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
      // this.props.history.replace("/racks", res.data.racks);
      this.props.history.push({
        pathname: "/racks",
        state: res.data.racks
      });
    });
  };
  state = {
    isOpen: false,
    isDeleteOpen: false,
    deleteRackInfo: {} as RackRangeFields,
    headers: {},
    isConfirmationOpen: false
  };
  private handleOpen = () => {
    this.setState({
      isOpen: true
    });
    console.log(this.state);
  };

  deleteRack = (rack: RackRangeFields, headers: any) => {
    this.setState({
      deleteRackInfo: rack,
      headers
    });
    this.handleConfirmationOpen();
  };
  actuallyDelete = () => {
    return axios
      .post(
        API_ROOT + "api/racks/delete",
        this.state.deleteRackInfo,
        this.state.headers
      )
      .then(res => {
        this.addToast({
          message: "Deleted rack(s) successfully",
          intent: Intent.PRIMARY
        });
        this.setState({ isDeleteOpen: false, isConfirmationOpen: false });
      })
      .catch(err => {
        console.log(err.response);
        this.addToast({
          message: err.response.data.failure_message,
          intent: Intent.DANGER
        });
        this.setState({ isDeleteOpen: true, isConfirmationOpen: false });
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

  private handleConfirmationCancel = () =>
    this.setState({ isConfirmationOpen: false });
  private handleConfirmationOpen = () =>
    this.setState({ isConfirmationOpen: true });

  public render() {
    return (
      <div className={Classes.DARK}>
        <Toaster
          autoFocus={false}
          canEscapeKeyClear={true}
          position={Position.TOP}
          ref={this.refHandlers.toaster}
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
        <Alert
          cancelButtonText="Cancel"
          confirmButtonText="Delete"
          intent="danger"
          isOpen={this.state.isConfirmationOpen}
          onCancel={this.handleConfirmationCancel}
          onConfirm={this.actuallyDelete}
        >
          <p>Are you sure you want to delete?</p>
        </Alert>

        <Card>
          {this.props.isAdmin ? (
            <div>
              <AnchorButton
                className="add"
                text={"Add Rack(s)"}
                icon="add"
                minimal
                intent={Intent.PRIMARY}
                onClick={this.handleOpen}
              />
              <AnchorButton
                className="add "
                text={"Delete Rack(s)"}
                icon="trash"
                minimal
                intent={Intent.DANGER}
                onClick={this.handleDeleteOpen}
              />
            </div>
          ) : null}
          <h4>View Rack(s)</h4>

          <RackSelectView submitForm={this.viewRackForm} />
        </Card>
        <ElementTabContainer />
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
