import "@blueprintjs/core/lib/css/blueprint.css";
import * as React from "react";
import { Tabs, Classes, Tab } from "@blueprintjs/core";

import "./elementView.scss";
import { ElementView } from "./elementView";
import { connect } from "react-redux";

interface ElementTabViewProps {
  isAdmin: boolean;
}
export class ElementTabView extends React.Component<ElementTabViewProps> {
  public render() {
    return (
      <Tabs
        className={Classes.DARK + " element-view"}
        animate={true}
        id="ElementViewer"
        key={"vertical"}
        renderActiveTabPanelOnly={false}
        vertical={true}
      >
        <Tab
          className="tab"
          id="instance"
          title="Instances"
          panel={
            <ElementView isAdmin={this.props.isAdmin} element="instances" />
          }
        />
        <Tab
          className="tab"
          id="model"
          title="Models"
          panel={<ElementView isAdmin={this.props.isAdmin} element="models" />}
        />
        <Tab
          className="tab"
          id="rack"
          title="Racks"
          panel={<ElementView isAdmin={this.props.isAdmin} element="racks" />}
        />
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

export default connect(mapStateToProps)(ElementTabView);
