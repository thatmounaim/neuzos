export const logme = (id: string, ...objs) => {
    console.log(`[LOG: ${id} ]`)
    if (objs.length > 0) {
        console.log(...objs)
        console.log(`------------------------------------`)
    }

} 