import "@blueprintjs/core/lib/css/blueprint.css";
import * as React from "react";
import { Tabs, Classes, Tab } from "@blueprintjs/core";
import ElementTab from "./elementTab";
import "./elementView.scss";
import { connect } from "react-redux";
import { ElementType } from "../../utils/utils";

interface ElementTabContainerProps {
  isAdmin: boolean;
}
class ElementTabContainer extends React.Component<ElementTabContainerProps> {
  public render() {
    return (
      <Tabs
        className={Classes.DARK + " element-view"}
        animate={true}
        id="ElementViewer"
        key={"vertical"}
        renderActiveTabPanelOnly={false}
        vertical={false}
        large
      >
        <Tab
          className="tab"
          id="instance"
          title="Instances"
          panel={<ElementTab element={ElementType.INSTANCE} />}
        />
        <Tab
          className="tab"
          id="model"
          title="Models"
          panel={<ElementTab element={ElementType.MODEL} />}
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

export default connect(mapStateToProps)(ElementTabContainer);
