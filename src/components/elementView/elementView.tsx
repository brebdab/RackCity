import { AnchorButton, Classes, Dialog } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import * as React from "react";
import { connect } from "react-redux";
import { API_ROOT } from "../../api-config";
import WrappedCreateModelForm from "../../forms/createModelForm";
import { ElementObjectType, ElementType } from "../utils";
import ElementTable from "./elementTable";
import "./elementView.scss";

interface ElementViewState {
  isOpen: boolean;
}
interface ElementViewProps {
  element: ElementType;
  isAdmin: boolean;
}

function getElementData(
  path: string,
  token: string
): Promise<Array<ElementObjectType>> {
  console.log(API_ROOT + "api/" + path + "get-many");

  const page_size = 30;
  const page = 1;

  const config = {
    headers: {
      Authorization: "Token " + token
    },
    params: {
      page_size,
      page
    }
  };
  return axios
    .post(API_ROOT + "api/" + path + "/get-many", {}, config)
    .then(res => {
      const items = res.data[path];

      return items;
    })
    .catch(err => console.log(err));
}
class ElementView extends React.Component<ElementViewProps, ElementViewState> {
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

        <ElementTable type={this.props.element} getData={getElementData} />
      </div>
    );
  }
}
const mapStateToProps = (state: any) => {
  return {
    isAdmin: state.admin
  };
};
export default connect(mapStateToProps)(ElementView);
