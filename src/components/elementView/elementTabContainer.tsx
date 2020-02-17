import "@blueprintjs/core/lib/css/blueprint.css";
import * as React from "react";
import { Tabs, Classes, Tab } from "@blueprintjs/core";
import ElementTab from "./elementTab";
import { RouteComponentProps } from "react-router";
import "./elementView.scss";
import { connect } from "react-redux";
import { ElementType } from "../../utils/utils";
import RackTab from "./rackTab";

interface ElementTabContainerProps {
  isAdmin: boolean;
}
class ElementTabContainer extends React.Component<
  ElementTabContainerProps & RouteComponentProps
  > {
  public render() {
    return (
      <Tabs
        className={Classes.DARK + " element-view"}
        animate={true}
        id="ElementViewer"
        key={"vertical"}
        renderActiveTabPanelOnly={false}
        vertical={true}
        large
      >
        <Tab
          className="tab"
          id="asset"
          title="Assets"
          panel={<ElementTab {...this.props} element={ElementType.ASSET} />}
        />

        <Tab
          className="tab"
          id="model"
          title="Models"
          panel={<ElementTab {...this.props} element={ElementType.MODEL} />}
        />

        <Tab className="tab" id="rack" title="Racks" panel={<RackTab />} />
        {this.props.isAdmin ? <Tab
          className="tab"
          id="datacenter"
          title="Datacenters"
          panel={<ElementTab {...this.props} element={ElementType.DATACENTER} />}
        /> : null}
        <Tabs.Expander />
      </Tabs>
    );
  }
}

const mapStateToProps = (state: any) => {
  return {
    isAdmin: state.admin
  };
};

export default connect(mapStateToProps)(ElementTabContainer);
