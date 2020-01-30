import { Spinner } from "@blueprintjs/core";
import React from "react";
import { connect } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router";
import {
  ElementType,
  isModelObject,
  isRackObject,
  ElementObjectType
} from "../utils";
import "./elementView.scss";
interface IElementTableState {
  items: Array<ElementObjectType>;
}

interface IElementTableProps {
  type: ElementType;
  token: string;
  getData?(type: string, token: string): Promise<Array<ElementObjectType>>;
  data?: Array<ElementObjectType>;
}

class ElementTable extends React.Component<
  IElementTableProps & RouteComponentProps,
  IElementTableState
> {
  public state: IElementTableState = {
    items: []
  };
  componentDidMount() {
    console.log(this.props.data);
    if (this.props.getData) {
      this.props.getData(this.props.type, this.props.token).then(res => {
        this.setState({
          items: res
        });
      });
      console.log("table mounted");
    }
  }

  render() {
    if (
      this.props.data &&
      this.props.data.length !== 0 &&
      this.state.items.length === 0
    ) {
      this.setState({
        items: this.props.data
      });
    }
    return this.state.items.length === 0 ? (
      <div className="loading-container">
        <Spinner
          className="center"
          intent="primary"
          size={Spinner.SIZE_STANDARD}
        />
        <h4>no {this.props.type}</h4>
      </div>
    ) : (
      <div className="ElementTable">
        <table className="bp3-html-table bp3-interactive bp3-html-table-striped bp3-html-table-bordered table">
          <thead>
            <tr>
              {Object.keys(this.state.items[0]).map((col: string) => {
                if (col !== "id") {
                  return <th>{col}</th>;
                }

                return null;
              })}
            </tr>
          </thead>
          <tbody>
            {this.state.items.map((item: ElementObjectType) => {
              return (
                <tr
                  onClick={() =>
                    this.props.history.push(
                      "/" + this.props.type + "/" + item.id
                    )
                  }
                >
                  {Object.entries(item).map(([col, value]) => {
                    if (isModelObject(value)) {
                      return <td>{value.vendor + " " + value.model_number}</td>;
                    } else if (isRackObject(value)) {
                      return <td>{value.row_letter + " " + value.rack_num}</td>;
                    } else if (col !== "id") {
                      return <td>{value}</td>;
                    }
                    return null;
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }
}
const mapStateToProps = (state: any) => {
  return {
    token: state.token
  };
};
export default connect(mapStateToProps)(withRouter(ElementTable));
