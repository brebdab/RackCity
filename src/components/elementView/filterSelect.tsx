import { Button, FormGroup, HTMLSelect, MenuItem, Popover } from "@blueprintjs/core";
import { DateRangeInput } from "@blueprintjs/datetime";
import "@blueprintjs/core/lib/css/blueprint.css";
import { Select } from "@blueprintjs/select";
import * as React from "react";
import { connect } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router";
import Field from "../../forms/field";
import "../../forms/forms.scss";
import {
  filterAssetField,
  renderAssetFieldItem,
  renderModelFieldItem,
  renderStringItem,
  filterModelField,
  filterString
} from "../../forms/formUtils";
import RackRangeForm from "../../forms/rackRangeForm";
import { updateObject } from "../../store/utility";
import {
  AssetFieldsTable,
  isRackRangeFields,
  RackRangeFields,
  ModelFieldsTable
} from "../../utils/utils";
import {
  FilterTypes,
  getFilterType,
  IFilter,
  NumericFilter,
  TextFilter,
  TextFilterTypes,
  DatetimeFilter
} from "./elementUtils";
import "./elementView.scss";

var console: any = {};
console.log = function () { };

interface FilterSelectProps {
  token: string;
  fields: Array<string>;
  handleAddFilter(filter: IFilter): void;
}

class FilterSelect extends React.Component<
  FilterSelectProps & RouteComponentProps,
  IFilter
  > {
  state = {
    id: "",
    field: "",
    filter: {} as TextFilter | NumericFilter | RackRangeFields | DatetimeFilter,
    filter_type: FilterTypes.TEXT
  };
  renderFilterOptions(field: string | undefined) {
    const type = getFilterType(field);
    if (type === FilterTypes.TEXT) {
      return this.getTextFilterOptions();
    }
    if (type === FilterTypes.NUMERIC) {
      return this.getNumericFilterOptions();
    }
    if (type === FilterTypes.RACKRANGE) {
      return this.getRackFilterOptions();
    }
    if (type === FilterTypes.DATETIME) {
      return this.getDatetimeFilterOptions();
    }
    return null;
  }
  setTextFilterType(type: TextFilterTypes) {
    this.setState({});
  }
  getRackFilterOptions() {
    console.log(this.state.filter);
    return this.state.filter && isRackRangeFields(this.state.filter) ? (
      <div>
        <RackRangeForm
          className=""
          values={this.state.filter}
          handleChange={this.handleChange}
        />
      </div>
    ) : null;
  }
  getDatetimeFilterOptions() {
    return (
      <FormGroup label="Date range">
        <DateRangeInput
          formatDate={(date: Date) => date.toLocaleString()}
          onChange={undefined}
          parseDate={(str: string) => new Date(str)}
          allowSingleDayRange={true}
          shortcuts={true}
          singleMonthOnly={true}
          closeOnSelection={false}
          timePrecision="minute"
        />
      </FormGroup>
    );
  }
  getNumericFilterOptions() {
    return (
      <div className="range">
        <FormGroup label="Min">
          <Field field="min" placeholder="min" onChange={this.handleChange} />
        </FormGroup>
        <FormGroup label="Max">
          <Field field="max" placeholder="max" onChange={this.handleChange} />
        </FormGroup>
      </div>
    );
  }

  getTextFilterOptions() {
    return (
      <div>
        <div className="bp3-select field test-select">
          <HTMLSelect
            onChange={(e: any) =>
              this.handleChange({ match_type: e.target.value })
            }
          >
            {" "}
            <option> {TextFilterTypes.CONTAINS}</option>
            <option>{TextFilterTypes.EXACT}</option>
          </HTMLSelect>
        </div>
        <FormGroup label="Query">
          <Field
            field="value"
            placeholder="query"
            type="string"
            onChange={this.handleChange}
          />
        </FormGroup>
      </div>
    );
  }
  setFilterType(field: string) {
    this.setState({
      field: field,
      filter_type: getFilterType(field)
    });
    const type = getFilterType(field);
    if (type === FilterTypes.TEXT) {
      const filter: TextFilter = {
        match_type: TextFilterTypes.CONTAINS
      };
      console.log(updateObject(this.state.filter, { ...filter }));
      this.setState({
        filter: filter
      });
    }
    if (type === FilterTypes.NUMERIC) {
      const filter: NumericFilter = {};
      this.setState({
        filter: filter
      });
    }
    if (type === FilterTypes.RACKRANGE) {
      const filter: RackRangeFields = { letter_start: "" } as RackRangeFields;
      this.setState({
        filter: filter
      });
    }
  }
  handleChange = (field: { [key: string]: any }) => {
    const test = updateObject(this.state.filter, {
      ...field
    });
    console.log(
      updateObject(this.state.filter, {
        ...field
      })
    );
    this.setState({
      filter: test
    });
  };
  handleSubmit = (e: any) => {
    e.preventDefault();
    console.log("test");
    const filter: IFilter = {
      field: this.state.field,
      filter_type: this.state.filter_type,
      filter: this.state.filter,
      id: this.state.field + JSON.stringify(this.state.filter)
    };
    console.log(filter);

    this.props.handleAddFilter(filter);
  };

  getItemRenderer() {
    if (this.props.fields.includes("asset_number")) {
      return renderAssetFieldItem;
    } else if (this.props.fields.includes("vendor")) {
      return renderModelFieldItem;
    }
    return renderStringItem;
  }

  getItemFilterer() {
    if (this.props.fields.includes("asset_number")) {
      return filterAssetField;
    } else if (this.props.fields.includes("vendor")) {
      return filterModelField;
    }
    return filterString;
  }

  getButtonText(field: string) {
    if (AssetFieldsTable[field]) {
      return AssetFieldsTable[field];
    } else if (ModelFieldsTable[field]) {
      return ModelFieldsTable[field];
    }
    return field;
  }
  render() {
    return (
      <div className="test-fields">
        <form onSubmit={this.handleSubmit}>
          <FormGroup className="field-select" label="Select Field To Filter ">
            {" "}
            <FieldSelect
              popoverProps={{
                minimal: true,
                popoverClassName: "dropdown",
                usePortal: true
              }}
              // inputValueRenderer={(letter: string) => letter}
              itemRenderer={this.getItemRenderer()}
              items={this.props.fields}
              onItemSelect={(field: string) => this.setFilterType(field)}
              itemPredicate={this.getItemFilterer()}
              noResults={<MenuItem disabled={true} text="No matching fields" />}
            >
              <Button
                rightIcon="caret-down"
                text={
                  this.state.field
                    ? this.getButtonText(this.state.field)
                    : "Select a Field"
                }
              />
            </FieldSelect>
          </FormGroup>

          {this.state.field
            ? [
              this.renderFilterOptions(this.state.field),
              <div className="add-filter">
                <Button icon="filter" type="submit">
                  Add Filter
                  </Button>
              </div>
            ]
            : null}
        </form>
      </div>
    );
  }
}

const FieldSelect = Select.ofType<string>();

const mapStateToProps = (state: any) => {
  return {
    token: state.token,
    isAdmin: state.admin
  };
};

export default connect(mapStateToProps)(withRouter(FilterSelect));
