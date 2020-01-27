import { AnchorButton, Classes, Dialog } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import * as React from "react";

import WrappedCreateModelForm from "../../forms/createModelForm";
import ElementTable from "./elementTable";
import "./elementView.scss";

interface ElementViewState {
  isOpen: boolean;
}
interface ElementViewProps {
  element: string;
}
interface ElementStateProps {
  isAdmin: boolean;
}

export class ElementView extends React.Component<
  ElementViewProps & ElementStateProps,
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
        {this.props.isAdmin
          ? [
              <AnchorButton
                text={"Add " + this.props.element.slice(0, -1)}
                icon="add"
                onClick={this.handleOpen}
              />,
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
                {this.props.element === "models" ? (
                  <WrappedCreateModelForm />
                ) : null}
              </Dialog>
            ]
          : null}
        <ElementTable element={this.props.element} />
      </div>
    );
  }
}

export default ElementView;
