import axios from "axios"

export const setDataInCache=async(port:any,{key,value,type}:any)=>{
    const {data} = await axios.post(`http://localhost:${port}/put`,{key,value,type},{ timeout: 3000 })
    return data;
}

export const deleteDataInCache=async (port:any,key:string) => {
    await axios.delete(`http://localhost:${port}/delete/${key}`)
}