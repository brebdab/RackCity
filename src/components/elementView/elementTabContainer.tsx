import "@blueprintjs/core/lib/css/blueprint.css";
import * as React from "react";
import { Tabs, Tab, Classes } from "@blueprintjs/core";
import ElementTab from "./elementTab";
import { RouteComponentProps } from "react-router";
import "./elementView.scss";
import { connect } from "react-redux";
import { ElementType, DatacenterObject, getHeaders, PermissionState } from "../../utils/utils";
import RackTab from "./rackTab";
import { API_ROOT } from "../../utils/api-config";
import axios from "axios";

interface ElementTabContainerProps {
  isAdmin: boolean;
  permissionState: PermissionState;
  token: string;
}
interface ElementTabContainerState {
  datacenters: Array<DatacenterObject>;
  currDatacenter: DatacenterObject;
}
export const ALL_DATACENTERS: DatacenterObject = {
  id: "",
  name: "All datacenters",
  abbreviation: "ALL"
};
// var console: any = {};
// console.log = function() {};

class ElementTabContainer extends React.Component<
  ElementTabContainerProps & RouteComponentProps,
  ElementTabContainerState
  > {
  state = {
    datacenters: [],
    currDatacenter: ALL_DATACENTERS
  };

  onDatacenterSelect = (datacenter: DatacenterObject) => {
    this.setState({
      currDatacenter: datacenter
    });
  };
  getDatacenters = () => {
    const headers = getHeaders(this.props.token);
    // console.log(API_ROOT + "api/datacenters/get-all");
    axios
      .post(API_ROOT + "api/datacenters/get-many", {}, headers)
      .then(res => {
        console.log(res.data.datacenters);
        const datacenters = res.data.datacenters as Array<DatacenterObject>;
        datacenters.push(ALL_DATACENTERS);
        this.setState({
          datacenters
        });
      })
      .catch(err => {
        console.log(err);
      });
  };
  componentDidMount = () => {
    console.log("tab container mounted");
    this.getDatacenters();
  };

  getTabName = (pathname: string) => {
    if (pathname === "/dashboard") {
      return "racks";
    }
    const regex = new RegExp("dashboard/(.*$)");
    const match = regex.exec(pathname);
    if (match) {
      return match[1];
    }
  };

  public render() {
    console.log(this.props.match, this.props.location);
    return (
      <Tabs
        className={Classes.DARK + " element-view "}
        animate={true}
        id="ElementViewer"
        key={"vertical"}
        selectedTabId={this.getTabName(this.props.location.pathname)}
        renderActiveTabPanelOnly={false}
        vertical={true}
        large
        onChange={(tab: any) => this.props.history.push("/dashboard/" + tab)}
      >
        <Tab
          className="tab"
          id="racks"
          title="Racks"
          panel={
            <RackTab
              datacenters={this.state.datacenters}
              currDatacenter={this.state.currDatacenter}
              onDatacenterSelect={this.onDatacenterSelect}
            />
          }
        />
        <Tab
          className="tab do-not-print"
          id="assets"
          title="Assets"
          panel={
            <ElementTab
              datacenters={this.state.datacenters}
              currDatacenter={this.state.currDatacenter}
              onDatacenterSelect={this.onDatacenterSelect}
              {...this.props}
              element={ElementType.ASSET}
              isActive={false}
            />
          }
        />

        <Tab
          className="tab do-not-print"
          id="models"
          title="Models"
          panel={<ElementTab {...this.props} element={ElementType.MODEL} />}
        />

        <Tab
          className="tab do-not-print"
          id="datacenters"
          title="Datacenters"
          disabled={
            !(this.props.permissionState.admin
              || this.props.permissionState.asset_management
            )
          }
          panel={
            <ElementTab
              {...this.props}
              updateDatacenters={this.getDatacenters}
              element={ElementType.DATACENTER}
            />
          }
        />

        <Tabs.Expander />
      </Tabs>
    );
  }
}

const mapStateToProps = (state: any) => {
  return {
    isAdmin: state.admin,
    permissionState: state.permissionState,
    token: state.token
  };
};

export default connect(mapStateToProps)(ElementTabContainer);
