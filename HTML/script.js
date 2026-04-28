function sum(x, y) {
    result = x + y;
    console.log(result)
}

sum(20, 30);

function changeColor(event) {
    console.log(event)
    event.target.style.backgroundColor = "yellow";
}
