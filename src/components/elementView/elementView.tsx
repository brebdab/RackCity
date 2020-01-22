import * as React from "react";


import {Cell, Column,Table } from "@blueprintjs/table";
import "@blueprintjs/table/lib/css/table.css";
import {  Tab, Tabs, Classes, NonIdealState } from "@blueprintjs/core";
import './elementView.scss';
//import { Classes} from "@blueprintjs/core";
import { useState, useEffect,useMemo } from "react";
import axios, { AxiosResponse } from 'axios';
import { ENGINE_METHOD_NONE } from "constants";
import { constants } from "crypto";


export interface ElementViewProps { 
    
}

export class ElementView extends React.PureComponent<ElementViewProps> {
    public render() {
        return (

            <Tabs
             className = {Classes.DARK}
            animate= {true}
            id="ElementViewer"
            key={"vertical"}
            renderActiveTabPanelOnly={false}
            vertical={true}
        >
            <Tab className="tab" id="instance" title="Instances" />
            <Tab  className="tab"id="model" title="Models" panel={<ElementTable />} />
            <Tab  className="tab"id="rack" title="Racks" panel={<TableExample/>} />
            <Tabs.Expander />
            {/* <InputGroup className={Classes.FILL} type="text" placeholder="Search..." /> */}
        </Tabs>



         );
    }
}
interface ElementTableState {
    columns: Array<string>,
    data:  any,

}
interface ElementTableProps {


}
//function getData(){
// const data = axios.get('https://rack-city-dev.herokuapp.com/api/').then(res => {
//     console.log(res.data);
//     return res.data();

//   });
//   return data;
// }
export class ElementTable extends React.Component<ElementTableProps, ElementTableState>{
  
   
       public state: ElementTableState = { 
            columns : [],
            data: [],

        
    }
       
    
    
    componentDidMount(){
        // this.setState({data:getData()})
         // axios.get('http://127.0.0.1:8000/api/').then(res => {
    //    console.log(res.data);
 
    //  })
        axios.get('https://rack-city-dev.herokuapp.com/api/').then(res => {
            console.log("test")
            console.log(res.data)
            const cols : Array<Array<string>> = res.data.map((item: any)=> {
                console.log(Object.keys(item));
                return Object.keys(item);
            // title: `${item.title}`,
            // content: `${item.content}`

            });
            this.setState({
                columns: cols[0],
                // columns: res.data.map((item: any)=> {
                //     console.log(Object.keys(item));
                //     return Object.keys(item);
                // // title: `${item.title}`,
                // // content: `${item.content}`

                // }),
            data: res.data.map((item: { title: any; content: any; id: any; }) => ({
                 title: `${item.title}`,
                 content: `${item.content}`,
                 id : `${item.id}`


            
            }))
        }
        
            );
            console.log("After set state");

            // .then((items: any) => this.setState({
            //     data: items
            // }))

            // this.setState({
            //     data: res.data

         
        });


      
    }
    public render(){
        console.log("render")
        console.log(this.state.columns)
    
        return (
            
         <Table 
         className = "table"
            numRows={5}
            >
                {this.state.columns.map((col:string) => {
                    console.log((col)) 
                    return (<Column name = {col} cellRenderer = {this.cellRenderer}/>);

                })
            }
             {/* {this.state.data.map(item => {
            
                 const {title,content} = item; 
                 console.log(title)
                 return (<Column name = {this.state.columns[]} cellRenderer = {this.cellRenderer}/>);

             }
                 
             )} */}

        </Table>

        )
        

    }
    cellRenderer = (rowID:number,colID:number )=>{
        const item = this.state.data[rowID];
        
        const col = this.state.columns[colID]
        console.log(`item.${col}`)
       
        const {idd, title,content} = item; 
        return <Cell>{title}</Cell>
    }
}


const TableExample: React.FunctionComponent<{}> = () => (
    <Table 
        numRows={5}
    >
        <Column name = "test"/>

        
        </Table>
 

);




    // // data state to store the TV Maze API data. Its initial value is an empty array
    // const [data, setData] = useState([]);
  
    // // Using useEffect to call the API once mounted and set the data
    // useEffect(() => {
    //   (async () => {
    //     const result = await axios("https://api.tvmaze.com/search/shows?q=snow");
    //     setData(result.data);
    //   })();
    // }, []);

    // const columns = useMemo(
    //     () => [
    //       {
    //         // first group - TV Show
    //         Header: "TV Show",
    //         // First group columns
    //         columns: [
    //           {
    //             Header: "Name",
    //             accessor: "show.name"
    //           },
    //           {
    //             Header: "Type",
    //             accessor: "show.type"
    //           }
    //         ]
    //       },
    //       {
    //         // Second group - Details
    //         Header: "Details",
    //         // Second group columns
    //         columns: [
    //           {
    //             Header: "Language",
    //             accessor: "show.language"
    //           },
    //           {
    //             Header: "Genre(s)",
    //             accessor: "show.genres"
    //           },
    //           {
    //             Header: "Runtime",
    //             accessor: "show.runtime"
    //           },
    //           {
    //             Header: "Status",
    //             accessor: "show.status"
    //           }
    //         ]
    //       }
    //     ],
    //     []
    //   );
  



export default ElementView
