import { Classes, Tab, Tabs, AnchorButton, Dialog } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import * as React from "react";
import { RouteComponentProps, withRouter } from "react-router";
import WrappedCreateModelForm from "../../forms/createModelForm";
import "./elementView.scss";
import ElementTable from "./elementTable";

//export interface ElementViewProps {}

export class ElementTabView extends React.PureComponent<RouteComponentProps> {
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
            <ElementView element="instances" history={this.props.history} />
          }
        />
        <Tab
          className="tab"
          id="model"
          title="Models"
          panel={<ElementView element="models" history={this.props.history} />}
        />
        <Tab
          className="tab"
          id="rack"
          title="Racks"
          panel={<ElementView element="racks" history={this.props.history} />}
        />
        <Tabs.Expander />
      </Tabs>
    );
  }
}

interface ElementViewState {
  isOpen: boolean;
}
interface ElementViewProps {
  element: string;
  history: any;
}

export class ElementView extends React.Component<
  ElementViewProps,
  ElementViewState
> {
  public state: ElementViewState = {
    isOpen: false
  };

  private handleOpen = () => {
    this.setState({
      isOpen: true
    });
  };
  private handleClose = () => this.setState({ isOpen: false });
  public render() {
    console.log(this.props.element);
    return (
      <div>
        <AnchorButton
          text={"Add " + this.props.element.slice(0, -1)}
          icon="add"
          onClick={this.handleOpen}
        />
        <Dialog
          className={Classes.DARK}
          usePortal={true}
          enforceFocus={true}
          canEscapeKeyClose={true}
          canOutsideClickClose={true}
          isOpen={this.state.isOpen}
          onClose={this.handleClose}
          title={"Add " + this.props.element.slice(0, -1)}
        >
          {this.props.element === "models" ? <WrappedCreateModelForm /> : null}
        </Dialog>
        <ElementTable {...this.props} />
      </div>
    );
  }
}

export default withRouter(ElementTabView);
