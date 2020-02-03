import { Classes, AnchorButton } from "@blueprintjs/core";
import * as React from "react";
import ElementTabView from "../elementView/elementTabView";
import RackSelectView, { RackRangeFields } from "../elementView/rackSelectView";
import { API_ROOT } from "../../api-config";
import axios from "axios";
import { RouteComponentProps, withRouter } from "react-router";
import FormPopup from "../../forms/FormPopup";
import { FormTypes } from "../../forms/modelForm";
import { ElementType } from "../utils";

interface LandingViewState {
  isOpen: boolean;
}
class LandingView extends React.Component<
  RouteComponentProps,
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
    isOpen: false
  };
  private handleOpen = () => {
    this.setState({
      isOpen: true
    });
    console.log(this.state);
  };

  createRack = (rack: RackRangeFields, headers: any) => {
    return axios
      .post(API_ROOT + "api/racks/create", rack, headers)
      .then(res => {});
  };
  private handleClose = () => this.setState({ isOpen: false });

  public render() {
    return (
      <div className={Classes.DARK}>
        <AnchorButton
          className="add-rack-button"
          text={"Add Rack"}
          icon="add"
          onClick={this.handleOpen}
        />
        <FormPopup
          type={FormTypes.CREATE}
          elementName={ElementType.RACK}
          submitForm={this.createRack}
          isOpen={this.state.isOpen}
          handleClose={this.handleClose}
        />
        <RackSelectView submitForm={this.viewRackForm} />
        <ElementTabView />
      </div>
    );
  }
}
export default withRouter(LandingView);
