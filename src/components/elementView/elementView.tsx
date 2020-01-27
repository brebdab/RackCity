import {
  AnchorButton,
  Classes,
  Dialog,
  Spinner,
  Tab,
  Tabs
} from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import * as React from "react";
import { RouteComponentProps, withRouter } from "react-router";
import { API_ROOT } from "../../api-config";
import WrappedCreateModelForm from "../../forms/createModelForm";
import "./elementView.scss";

//export interface ElementViewProps {}

export class ElementView extends React.PureComponent<RouteComponentProps> {
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
            <ElementTable element="instances" history={this.props.history} />
          }
        />
        <Tab
          className="tab"
          id="model"
          title="Models"
          panel={<ElementTable element="models" history={this.props.history} />}
        />
        <Tab
          className="tab"
          id="rack"
          title="Racks"
          panel={<ElementTable element="racks" history={this.props.history} />}
        />
        <Tabs.Expander />
      </Tabs>
    );
  }
}

async function getData(path: string) {
  console.log(API_ROOT + "api/" + path);
  return await axios
    //.get("https://rack-city-dev.herokuapp.com/api/" + path)
    .get(API_ROOT + "api/" + path)
    .then(res => {
      const data = res.data;
      const cols: Array<Array<string>> = data.map((item: any) => {
        return Object.keys(item);
      });
      return { cols, data };
    });
}

interface ElementTableState {
  columns: Array<string>;
  data: any;
  isOpen: boolean;
}
interface ElementTableProps {
  element: string;
  history: any;
}

export class ElementTable extends React.Component<
  ElementTableProps,
  ElementTableState
> {
  public state: ElementTableState = {
    columns: [],
    data: [],
    isOpen: false
  };

  async componentDidMount() {
    const resp = await getData(this.props.element);
    console.log(resp.cols);
    const cols = resp.cols.length === 0 ? [] : resp.cols[0];

    this.setState({
      columns: cols,

      data: resp.data
    });
  }

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
        {this.state.columns.length === 0 ? (
          <div className="loading-container">
            <p className="center">No {this.props.element} data found </p>
            <p></p>
            <Spinner
              className="center"
              intent="primary"
              size={Spinner.SIZE_STANDARD}
            />
          </div>
        ) : (
          <div className="ElementTable">
            <table className="bp3-html-table bp3-interactive bp3-html-table-striped bp3-html-table-bordered">
              <thead>
                <tr>
                  {this.state.columns.map((col: string) => {
                    if (col !== "id") {
                      return <th>{col}</th>;
                    }
                    return null;
                  })}
                </tr>
              </thead>
              <tbody>
                {this.state.data.map((item: any) => {
                  return (
                    <tr
                      onClick={() =>
                        this.props.history.push(
                          "/" + this.props.element + "/" + item["id"] // TODO replace test_rid with param */
                          // { rackname: "hello" } // pass additional props here
                        )
                      }
                    >
                      {this.state.columns.map((col: string) => {
                        if (col !== "id") {
                          return <td>{item[col]}</td>;
                        }
                        return null;
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }
}

export default withRouter(ElementView);
