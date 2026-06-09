//receives timestamp
 //   get hour from timestamp
 //   if hour >= 1 and hour <= 5 → return 20
  //  else → return 0



export default function nightActivityRule(timestamp: number): number {
    const date = new Date(timestamp);
    const hour = date.getUTCHours();

    if (hour >= 1 && hour <= 5) {
        return 20;
    }
    else {
        return 0;
    }
}