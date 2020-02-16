import {
  Icon,
  HTMLSelect,
  Position,
  IToastProps,
  Toaster,
  Intent
} from "@blueprintjs/core";
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
  isRackObject,
  RackRangeFields
} from "../../utils/utils";
import DragDropList from "./dragDropList";
import "./elementView.scss";
import FilterSelectView, { IFilter } from "./filterSelect";

interface ElementTableState {
  items: Array<ElementObjectType>;
  sort_by: Array<ITableSort>;
  // sort_by_id: Array<ITableSort & IDragAndDrop>;
  filters: Array<IFilter>;
  sorted_cols: Array<string>;
  curr_page: number;
  total_pages: number;
  page_type: PagingTypes;
  fields: Array<string>;
}
// var console: any = {};
// console.log = function() {};
export interface ITableSort {
  field: string;
  ascending: boolean;
  id: string;
}
// const PAGE_SIZE = 10;

export enum PagingTypes {
  TEN = 10,
  FIFTY = 50,
  ALL = "View All"
}
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

interface ElementTableProps {
  callback?: Function;
  type: ElementType;
  token: string;
  disableSorting?: boolean;
  disableFiltering?: boolean;
  getData?(
    type: string,
    page_num: number,
    page_type: PagingTypes,
    body: any,
    token: string
  ): Promise<Array<ElementObjectType>>;

  getFieldNames?(type: string, headers: any): Promise<Array<string>>;
  getPages?(
    type: string,
    page_size: PagingTypes,
    filters: Array<IFilter>,
    token: string
  ): Promise<number>;
  data?: Array<ElementObjectType>;
  shouldUpdateData?: boolean;
}

class ElementTable extends React.Component<
  ElementTableProps & RouteComponentProps,
  ElementTableState
> {
  public state: ElementTableState = {
    // sort_by_id: [],
    page_type: 10,
    filters: [],
    sort_by: [],
    items: [],
    sorted_cols: [],
    curr_page: 1,
    total_pages: 0,
    fields: []
  };

  previousPage = () => {
    if (this.state.curr_page > 1 && this.props.getData) {
      const next_page = this.state.curr_page - 1;
      const { sort_by, filters } = this.state;
      this.props
        .getData(
          this.props.type,
          next_page,
          this.state.page_type,
          { sort_by, filters },
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
      const { filters } = this.state;
      this.props
        .getData(
          this.props.type,
          next_page,
          this.state.page_type,
          { sort_by, filters },
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
            icon={IconNames.DRAG_HANDLE_VERTICAL}
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
        <span>
          <Icon
            className="icon"
            icon={IconNames.DRAG_HANDLE_VERTICAL}
            iconSize={Icon.SIZE_STANDARD}
          />
        </span>
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
  private addToast(toast: IToastProps) {
    toast.timeout = 5000;
    this.toaster.show(toast);
  }

  private toaster: Toaster = {} as Toaster;
  private refHandlers = {
    toaster: (ref: Toaster) => (this.toaster = ref)
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
      // console.log(item.filter, filter.filter);
      return JSON.stringify(item) !== JSON.stringify(filter);
    });
    // console.log(filters);
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
    console.log(items);
    if (this.props.callback! !== undefined) this.props.callback(items);
    const filter_body = items.map(item => {
      const { field, filter_type, filter } = item;
      return { field, filter_type, filter };
    });
    if (this.props.getData) {
      this.props.getData!(
        this.props.type,
        this.state.curr_page,
        this.state.page_type,
        { sort_by: this.state.sort_by, filters: filter_body },
        this.props.token
      )
        .then(res => {
          this.setState({
            items: res
          });
          if (res.length === 0) {
            this.setState({
              curr_page: 0
            });
          }
        })
        .catch(err => {
          console.log("ERROR", err.response.data);
          this.addToast({
            message: err.response.data.failure_message,
            intent: Intent.DANGER
          });
        });
    }
    if (this.props.getPages) {
      this.props
        .getPages(
          this.props.type,
          this.state.page_type,
          this.state.filters,
          this.props.token
        )
        .then(res => {
          this.setState({
            total_pages: res
          });
        });
    }
  };

  updateData = (page: PagingTypes) => {
    if (this.props.getData) {
      this.props.getData!(
        this.props.type,
        this.state.curr_page,
        page,
        { sort_by: this.state.sort_by, filters: this.state.filters },
        this.props.token
      )
        .then(res => {
          this.setState({
            items: res
          });
          console.log("DATA", res);
        })
        .catch(err => {
          this.addToast({
            message: err.response.data.failure_message,
            intent: Intent.DANGER
          });
        });
    }
    if (this.props.getPages) {
      this.props
        .getPages(this.props.type, page, this.state.filters, this.props.token)
        .then(res => {
          this.setState({
            total_pages: res
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
        this.state.page_type,
        { sort_by: sorts_body, filters: this.state.filters },
        this.props.token
      ).then(res => {
        this.setState({
          items: res
        });
      });
    }
  };
  componentDidUpdate() {
    if (this.props.shouldUpdateData) {
      console.log("table updated");
      this.updateTableData();
    }
  }
  componentDidMount() {
    console.log("table mounted ");
    this.updateTableData();
  }
  updateTableData = () => {
    const sorts_body = this.state.sort_by.map(item => {
      const { field, ascending } = item;
      return { field, ascending };
    });
    if (this.props.getData) {
      this.props
        .getData(
          this.props.type,
          this.state.curr_page,
          this.state.page_type,
          { sort_by: sorts_body, filters: this.state.filters },
          this.props.token
        )
        .then(res => {
          this.setState({
            items: res
          });
          console.log("DATA", res);
          this.setFieldNames();
        })
        .catch(err => {
          console.log(err);
        });
    }
    if (this.props.getPages) {
      this.props
        .getPages(
          this.props.type,
          this.state.page_type,
          this.state.filters,
          this.props.token
        )
        .then(res => {
          this.setState({
            total_pages: res
          });
        });
    }
  };
  updateSortOrder = (items: Array<ITableSort>) => {
    // console.log(items);
    this.setState({
      sort_by: items
    });
    this.updateSortData(items);
  };

  updateFilterOrder = (items: Array<IFilter>) => {
    this.setState({
      filters: items,
      curr_page: 1
    });
    this.updateFilterData(items);
  };
  setFieldNames = () => {
    let fields: Array<string> = [];

    if (this.state.items && this.state.items.length > 0) {
      Object.keys(this.state.items[0]).forEach((col: string) => {
        if (col === "model") {
          fields.push("model__vendor");
          fields.push("model__model_number");
        }
        if (col === "network_ports") {
          fields.push("num_network_ports");
        } else if (col !== "id") {
          fields.push(col);
        }
      });
      this.setState({
        fields: fields
      });
    }

    console.log("COLUMN NAMES", fields);
  };

  getScrollIcon = (field: string) => {
    return this.props.disableSorting ? null : (
      <Icon
        className="icon"
        icon={IconNames.DOUBLE_CARET_VERTICAL}
        iconSize={Icon.SIZE_STANDARD}
        onClick={() => this.handleSort(field)}
      />
    );
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
  handlePagingChange = (page: PagingTypes) => {
    this.setState({
      page_type: page
    });
    this.updateData(page);
  };
  render() {
    // console.log(this.state.items);
    // console.log(!(this.state.items && this.state.items.length > 0));
    //
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
        <Toaster
          autoFocus={false}
          canEscapeKeyClear={true}
          position={Position.TOP}
          ref={this.refHandlers.toaster}
        />

        {this.props.disableFiltering
          ? null
          : [
              <div className="filter-select">
                <FilterSelectView
                  handleAddFilter={this.addFilter}
                  fields={this.state.fields}
                />
              </div>,
              <div className="table-options">
                <p>Applied filters:</p>
                <DragDropList
                  items={this.state.filters}
                  renderItem={this.renderFilterItem}
                  onChange={this.updateFilterOrder}
                />
              </div>
            ]}
        {this.props.disableSorting ? null : (
          <div className="table-options">
            <p>Applied sorts:</p>
            <DragDropList
              items={this.state.sort_by}
              renderItem={this.renderSortItem}
              onChange={this.updateSortOrder}
            />
          </div>
        )}

        <div>
          {this.props.getPages ? (
            <div className="table-control">
              <HTMLSelect
                onChange={(e: any) => this.handlePagingChange(e.target.value)}
              >
                {" "}
                <option> {PagingTypes.TEN}</option>
                <option>{PagingTypes.FIFTY}</option>
                <option>{PagingTypes.ALL}</option>
              </HTMLSelect>
              {this.state.page_type !== PagingTypes.ALL
                ? [
                    <span>
                      <Icon
                        className="icon"
                        icon={IconNames.CARET_LEFT}
                        iconSize={Icon.SIZE_LARGE}
                        onClick={() => this.previousPage()}
                      />
                    </span>,
                    <span>
                      page {this.state.curr_page} of {this.state.total_pages}
                    </span>,
                    <span>
                      <Icon
                        className="icon"
                        icon={IconNames.CARET_RIGHT}
                        iconSize={Icon.SIZE_LARGE}
                        onClick={() => this.nextPage()}
                      />
                    </span>
                  ]
                : null}
            </div>
          ) : null}
          {this.state.fields.length === 0 ? null : (
            <table className="bp3-html-table bp3-interactive bp3-html-table-striped bp3-html-table-bordered element-table">
              <thead>
                <tr>
                  {this.state.fields.map((col: string) => {
                    if (col === "model") {
                      return [
                        <th className="header-cell">
                          <div className="header-text">
                            <span>model vendor</span>
                            {this.getScrollIcon("model__vendor")}
                          </div>
                        </th>,
                        <th className="header-cell">
                          <div className="header-text">
                            <span>model number</span>
                            {this.getScrollIcon("model__model_number")}
                          </div>
                        </th>
                      ];
                    } else if (col !== "id") {
                      return (
                        <th className="header-cell">
                          <div className="header-text">
                            <span>{col}</span>
                            {this.getScrollIcon(col)}
                          </div>
                        </th>
                      );
                    }

                    return null;
                  })}
                </tr>
              </thead>
              {this.state.items && this.state.items.length > 0 ? (
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
                          } else if (col == "network_ports") {
                            return <td>{value ? value.length : ""}</td>;
                          } else if (col === "display_color") {
                            console.log(value);
                            return (
                              <td
                                style={{
                                  backgroundColor: value
                                }}
                              ></td>
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
              ) : (
                <div className="loading-container">
                  {/* <Spinner
                    className="center"
                    intent="primary"
                    size={Spinner.SIZE_STANDARD}
                  /> */}
                  <h4 className="center">no {this.props.type} found </h4>
                </div>
              )}
            </table>
          )}
        </div>
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
