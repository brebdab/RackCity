import { Icon, Spinner } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import { IconNames } from "@blueprintjs/icons";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";
import React from "react";
import { connect } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router";
import {
  ElementObjectType,
  ElementType,
  isModelObject,
  isRackObject
} from "../utils";
import DragDropList from "./dragDropList";
import "./elementView.scss";
import FilterSelectView, { IFilter } from "./filterSelectView";
import RackRangeOptions from "./rackRangeOptions";
import { RackRangeFields } from "./rackSelectView";
interface IElementTableState {
  items: Array<ElementObjectType>;
  sort_by: Array<ITableSort>;
  // sort_by_id: Array<ITableSort & IDragAndDrop>;
  filters: Array<IFilter>;
  sorted_cols: Array<string>;
  curr_page: number;
  total_pages: number;
}
export interface ITableSort {
  field: string;
  ascending: boolean;
  id: string;
}
const PAGE_SIZE = 10;

export enum FilterTypes {
  TEXT = "text",
  NUMERIC = "numeric",
  RACKRANGE = "rack_range"
}
export interface NumericFilter {
  min: number;
  max: number;
}
export interface TextFilter {
  value: string;
  match_type: string;
}

interface IDragAndDrop {
  id: string;
}

interface IElementTableProps {
  type: ElementType;
  token: string;
  getData?(
    type: string,
    page_num: number,
    page_size: number,
    body: any,
    token: string
  ): Promise<Array<ElementObjectType>>;
  getPages?(type: string, page_size: number, token: string): Promise<number>;
  data?: Array<ElementObjectType>;
}

class ElementTable extends React.Component<
  IElementTableProps & RouteComponentProps,
  IElementTableState
> {
  public state: IElementTableState = {
    // sort_by_id: [],
    filters: [],
    sort_by: [],
    items: [],
    sorted_cols: [],
    curr_page: 1,
    total_pages: 0
  };
  previousPage = () => {
    if (this.state.curr_page > 1 && this.props.getData) {
      const next_page = this.state.curr_page - 1;
      const { sort_by } = this.state;
      this.props
        .getData(
          this.props.type,
          next_page,
          PAGE_SIZE,
          { sort_by },
          this.props.token
        )
        .then(res => {
          this.setState({
            items: res,
            curr_page: next_page
          });
        });
    }
  };
  nextPage = () => {
    if (this.state.curr_page < this.state.total_pages && this.props.getData) {
      const next_page = this.state.curr_page + 1;
      const { sort_by } = this.state;
      this.props
        .getData(
          this.props.type,
          next_page,
          PAGE_SIZE,
          { sort_by },
          this.props.token
        )
        .then(res => {
          this.setState({
            items: res,
            curr_page: next_page
          });
        });
    }
  };

  renderTextFilterItem = (item: TextFilter) => {
    return `${item.match_type} ${item.value}`;
  };

  renderNumericFilterItem = (item: NumericFilter) => {
    return `between ${item.min} - ${item.max}`;
  };
  renderRackRangeFilterItem = (item: RackRangeFields) => {
    return `rows  ${item.letter_start} - ${item.letter_end} & racks ${item.num_start} - ${item.num_end}`;
  };

  renderFilterItem = (item: IFilter) => {
    let display;
    if (item.filter_type === FilterTypes.TEXT) {
      display = this.renderTextFilterItem(item.filter! as TextFilter);
    } else if (item.filter_type === FilterTypes.NUMERIC) {
      display = this.renderNumericFilterItem(item.filter! as NumericFilter);
    } else if (item.filter_type === FilterTypes.RACKRANGE) {
      display = this.renderRackRangeFilterItem(item.filter as RackRangeFields);
    }
    return (
      <div className="drag-drop-text">
        <span>
          <Icon
            className="icon"
            icon={IconNames.FILTER_LIST}
            iconSize={Icon.SIZE_STANDARD}
          />
        </span>
        <span>{`${item.field} ${display} 
      `}</span>

        <span>
          <Icon
            className="icon"
            icon={IconNames.DELETE}
            iconSize={Icon.SIZE_STANDARD}
            onClick={() => this.removeFilterItem(item)}
          />
        </span>
      </div>
    );
    // field: string;
    // filter_type: FilterTypes;
    // filter: TextFilter | NumericFilter | RackRangeFields;
  };

  renderSortItem = (item: ITableSort) => {
    return (
      <div className="drag-drop-text ">
        <span>{`${item.field} by ${
          item.ascending ? "ascending" : "descending"
        }`}</span>

        <span>
          <Icon
            className="icon"
            icon={IconNames.DELETE}
            iconSize={Icon.SIZE_STANDARD}
            onClick={() => this.removeSortItem(item.field)}
          />
        </span>
      </div>
    );
  };

  removeSortItem = (field: string) => {
    let sorts = this.state.sort_by;
    let sorted_cols = this.state.sorted_cols;
    const index = sorted_cols.indexOf(field, 0);
    if (index > -1) {
      sorted_cols.splice(index, 1);
    }
    sorts = sorts.filter(item => {
      return item.field !== field;
    });
    this.setState({
      sort_by: sorts,
      sorted_cols
      // sort_by_id: sorts_id
    });
    this.updateSortData(sorts);
  };
  removeFilterItem = (filter: IFilter) => {
    const filters = this.state.filters.filter(item => {
      console.log(item.filter, filter.filter);
      return JSON.stringify(item) !== JSON.stringify(filter);
    });
    console.log(filters);
    this.setState({
      filters
    });
    this.updateFilterData(filters);
  };

  handleSort(field: string) {
    let ascending;
    let sorts = this.state.sort_by;

    const sorted_cols = this.state.sorted_cols;
    if (this.state.sorted_cols.includes(field)) {
      ascending = !this.state.sort_by.find(item => item.field === field)!
        .ascending;
      sorts = sorts.filter(item => {
        return item.field !== field;
      });
      this.setState({
        sort_by: sorts
        // sort_by_id: sorts_id
      });
    } else {
      ascending = true;
      sorted_cols.push(field);
    }
    // if (!this.state.sorted_cols.includes(field)) {

    sorts.push({
      field,
      ascending,
      id: field
    });
    this.setState({
      sort_by: sorts,
      sorted_cols
      // sort_by_id: sorts_id
    });
    this.updateSortData(sorts);
    // } else {
    // }
  }

  updateFilterData = (items: Array<IFilter>) => {
    console.log("detected new filters", {
      sort_by: this.state.sort_by,
      filters: items
    });
    if (this.props.getData) {
      this.props.getData!(
        this.props.type,
        this.state.curr_page,
        PAGE_SIZE,
        { sort_by: this.state.sort_by, filters: items },
        this.props.token
      ).then(res => {
        this.setState({
          items: res
        });
      });
    }
  };
  updateSortData = (items: Array<ITableSort>) => {
    const sorts_body = items.map(item => {
      const { field, ascending } = item;
      return { field, ascending };
    });
    console.log("detected new sorts ", sorts_body);
    if (this.props.getData) {
      this.props.getData!(
        this.props.type,
        this.state.curr_page,
        PAGE_SIZE,
        { sort_by: sorts_body, filters: this.state.filters },
        this.props.token
      ).then(res => {
        this.setState({
          items: res
        });
      });
    }
  };

  componentDidMount() {
    console.log(this.props.data);
    if (this.props.getData) {
      this.props
        .getData(
          this.props.type,
          this.state.curr_page,
          PAGE_SIZE,
          {},
          this.props.token
        )
        .then(res => {
          this.setState({
            items: res
          });
        })
        .catch(err => {
          console.log(err);
        });

      console.log("table mounted");
    }
    if (this.props.getPages) {
      this.props
        .getPages(this.props.type, PAGE_SIZE, this.props.token)
        .then(res => {
          this.setState({
            total_pages: res
          });
        });
    }
  }
  updateSortOrder = (items: Array<ITableSort>) => {
    console.log(items);
    this.setState({
      sort_by: items
    });
    this.updateSortData(items);
  };
  getFieldNames = () => {
    let fields: Array<string> = [];
    if (this.state.items && this.state.items.length > 0) {
      Object.keys(this.state.items[0]).forEach((col: string) => {
        if (col === "model") {
          fields.push("model vendor");
          fields.push("model number");
        } else if (col !== "id") {
          fields.push(col);
        }
      });
    }
    return fields;
  };

  addFilter = (filter: IFilter) => {
    const filters = this.state.filters;
    filters.push(filter);
    console.log(filters);
    this.setState({
      filters
    });
    this.updateFilterData(filters);
  };
  render() {
    console.log(this.state.items);
    console.log(!(this.state.items && this.state.items.length > 0));
    if (
      this.props.data &&
      this.props.data.length !== 0 &&
      this.state.items.length === 0
    ) {
      this.setState({
        items: this.props.data
      });
    }
    return (
      <div>
        <div className="filter-select">
          <FilterSelectView
            handleAddFilter={this.addFilter}
            fields={this.getFieldNames()}
          />
        </div>
        <div className="table-options">
          <DragDropList
            items={this.state.filters}
            renderItem={this.renderFilterItem}
            onChange={this.updateSortOrder}
          />
          <DragDropList
            items={this.state.sort_by}
            renderItem={this.renderSortItem}
            onChange={this.updateSortOrder}
          />
        </div>
        {!(this.state.items && this.state.items.length > 0) ? (
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
            <div className="table-control">
              <span>
                <Icon
                  className="icon"
                  icon={IconNames.CARET_LEFT}
                  iconSize={Icon.SIZE_LARGE}
                  onClick={() => this.previousPage()}
                />
              </span>
              <span>
                page {this.state.curr_page} of {this.state.total_pages}
              </span>
              <span>
                <Icon
                  className="icon"
                  icon={IconNames.CARET_RIGHT}
                  iconSize={Icon.SIZE_LARGE}
                  onClick={() => this.nextPage()}
                />
              </span>
            </div>
            <table className="bp3-html-table bp3-interactive bp3-html-table-striped bp3-html-table-bordered table">
              <thead>
                <tr>
                  {Object.keys(this.state.items[0]).map((col: string) => {
                    if (col === "model") {
                      return [
                        <th className="header-cell">
                          <div className="header-text">
                            <span>model vendor</span>
                            <Icon
                              className="icon"
                              icon={IconNames.DOUBLE_CARET_VERTICAL}
                              iconSize={Icon.SIZE_STANDARD}
                              onClick={() => this.handleSort("model__vendor")}
                            />
                          </div>
                        </th>,
                        <th className="header-cell">
                          <div className="header-text">
                            <span>model number</span>
                            <Icon
                              className="icon"
                              icon={IconNames.DOUBLE_CARET_VERTICAL}
                              iconSize={Icon.SIZE_STANDARD}
                              onClick={() =>
                                this.handleSort("model__model_number")
                              }
                            />
                          </div>
                        </th>
                      ];
                    } else if (col !== "id") {
                      return (
                        <th className="header-cell">
                          <div className="header-text">
                            <span>{col}</span>
                            <Icon
                              className="icon"
                              icon={IconNames.DOUBLE_CARET_VERTICAL}
                              iconSize={Icon.SIZE_STANDARD}
                              onClick={() => this.handleSort(col)}
                            />
                          </div>
                        </th>
                      );
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
                          return [
                            <td>{value.vendor}</td>,
                            <td>{value.model_number}</td>
                          ];
                        } else if (isRackObject(value)) {
                          return (
                            <td>{value.row_letter + " " + value.rack_num}</td>
                          );
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
        )}
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
