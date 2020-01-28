import "@blueprintjs/core/lib/css/blueprint.css";
import * as React from "react";
import { Tabs, Classes, Tab } from "@blueprintjs/core";
import ElementView from "./elementView";
import "./elementView.scss";
import { connect } from "react-redux";
import { ElementType } from "../utils";

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
          panel={<ElementView element={ElementType.INSTANCE} />}
        />
        <Tab
          className="tab"
          id="model"
          title="Models"
          panel={<ElementView element={ElementType.MODEL} />}
        />
        {/* <Tab
          className="tab"
          id="rack"
          title="Racks"
          panel={<ElementView element="racks" />}
        /> */}
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
