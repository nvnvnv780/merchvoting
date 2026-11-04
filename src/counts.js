export function parseCounts(data,length){
 if(!Array.isArray(data?.counts))throw new Error('Chưa tải được kết quả bình chọn.');
 const values=Array(length).fill(0),seen=new Set();
 for(const row of data.counts){
  if(!Number.isInteger(row?.id)||row.id<1||!Number.isSafeInteger(row.count)||row.count<0||seen.has(row.id))throw new Error('Kết quả bình chọn chưa hợp lệ.');
  seen.add(row.id);if(row.id<=length)values[row.id-1]=row.count;
 }
 return values;
}
