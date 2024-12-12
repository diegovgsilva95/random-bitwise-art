const rand = (n, x) => Math.random() * (x - n) + n
const irand = (n, x) => Math.round(rand(n, x))
const choose = a => a[irand(0, a.length-1)]
const sleep = ms => new Promise(r => setTimeout(r, ms))
const log = console.log.bind(console)

const Bitwise = new class {
    _assertByte(v){
        if(typeof v !== "string")
            throw new Error(`${v} was expected to be a string`)

        if(v.length !== 8)
            throw new Error(`${v} was expected to have 8 bits`)

        for(let c of v)
            if(c != "0" && c != "1")
                throw new Error(`${v} has invalid bit ${c}`)

        return true
    }
    NOT = function(a){
        this._assertByte(a)

        return [...a].map(bit => 1-(+bit)).join("")
    }
    AND = function(a,b){
        this._assertByte(a)
        this._assertByte(b)

        let r = ""
        for(let i in a)
            r += (+a[i]) * (+b[i])
        
        return r
    }
    NAND = function(a,b){
        this._assertByte(a)
        this._assertByte(b)

        let r = ""
        for(let i in a)
            r += 1 - ((+a[i]) * (+b[i]))
        
        return r
    }
    OR = function(a,b){
        this._assertByte(a)
        this._assertByte(b)

        let r = ""
        
        for(let i in a)
            r += ((+a[i]) + (+b[i]))>0?1:0
        
        return r
    }
    NOR = function(a,b){
        this._assertByte(a)
        this._assertByte(b)

        let r = ""
        for(let i in a)
            r += ((+a[i]) + (+b[i]))>0?0:1
        
        return r
    }
    XOR = function(a,b){
        this._assertByte(a)
        this._assertByte(b)

        let r = ""
        for(let i in a)
            r += ((+a[i]) + (+b[i]))==1?1:0
        
        return r
    }
    XNOR = function(a,b){
        this._assertByte(a)
        this._assertByte(b)

        let r = ""
        for(let i in a)
            r += ((+a[i]) + (+b[i]))==1?0:1
        
        return r
    }
    OPS = ['NOT', 'AND', 'NAND', 'OR', 'NOR', 'XOR', 'XNOR']
}()

const ASTNode = class {
    static id = 0
    value = null
    members = []
    constructor(value, ...members){
        this.id = ++this.constructor.id
        this.value = value
        this.members.push(...members)
    }
    toString(){
        Finder.iterations.strcast++
        let {value, members} = this
        switch(this.members.length){
            case 0:
                return `${value}`
            case 1: 
                return `(${value} ${members[0]})`
            case 2:
                return `(${members[0]} ${value} ${members[1]})`
            default:
                return `${value}(${members.join(", ")})`
        }
    }
    save(){
        Finder.iterations.save++
        // log(`Saving id ${this.id}`)
        this._value = this.value
        this._members = [...this.members]
        for(let member of this._members)
            if(member instanceof this.constructor)
                member.save()
    }
    restore(){
        Finder.iterations.restore++
        // log(`Restoring id ${this.id}`)

        this.value = this._value
        this.members = this._members

        for(let member of this.members)
            if(member instanceof this.constructor)
                member.restore()

    }
    propagateAB(a, b){
        Finder.iterations.propagate++

        if(this.value == "%a")
            this.value = a
        
        else if(this.value == "%b")
            this.value = b

        for(let [i,member] of Object.entries(this.members))
            if(member instanceof this.constructor)
                member.propagateAB(a, b)
            else if(member == "%a")
                this.members[i] = a
            else if(member == "%b")
                this.members[i] = b
    }
    collapse(){
        Finder.iterations.collapse++

        for(let [i, member] of Object.entries(this.members)){
            if(member instanceof this.constructor){
                member.collapse()
                this.members[i] = member.value
            }
        }
        let res = Bitwise[this.value].call(Bitwise, ...this.members.map(m=>m.toString(2).padStart(8,"0")))
        this.value = parseInt(res,2)
        this.members = []
    }
}
const Finder = new class {
    formula = null
    tree = null
    maxDepth = 3
    iterations = {
        save: 0,
        restore: 0,
        collapse: 0,
        propagate: 0,
        strcast: 0
    }
    generateSubtree(node, depth = 0){
        let choices = ["#", "%a", "%b"]
        if(depth < this.maxDepth)
            choices.push("O","O","O") // Weighted for operations

        let memberCount = ["NOT"].includes(node.value) ? 1 : 2

        for(let m = 0; m < memberCount; m++){
            let c = choose(choices)
            if(c == "#")
                node.members.push(irand(0,255))
            else if(c == "O"){
                let subnode = new ASTNode(choose(Bitwise.OPS))
                this.generateSubtree(subnode, depth+1)
                node.members.push(subnode)
            }
            else
                node.members.push(c)
        }
    }
    regenerate(){
        this.iterations = {
            save: 0,
            restore: 0,
            collapse: 0,
            propagate: 0,
            strcast: 0
        }
        let op = choose(Bitwise.OPS)
        let node = this.tree = new ASTNode(op)
        this.generateSubtree(node)
        node.save()

        let formula = this.formula = String(node)
        return formula
    }
    solve(a,b){
        this.tree.save()
        this.tree.propagateAB(a, b)
        this.tree.collapse()
        let result = this.tree.value
        this.tree.restore()
        return result
    }
}()

let stopped = false
const elmFormula = document.querySelector("#curr-formula")
const elmTable = document.querySelector("tbody")
const elmBtnStop = document.querySelector("button") // No other button on page.
const canvas = document.querySelector("canvas")
const ctx = canvas.getContext("2d", {willReadFrequently: true})
const ctxBuf = ctx.getImageData(0,0,256,256)
const checkStopped = function(){
    if(stopped){
        elmBtnStop.innerText = "Restart"
        elmBtnStop.disabled = false
        return true
    }
}
const trigger = async function(){
    if(checkStopped()) return
    let formula = Finder.regenerate()
    elmFormula.innerText = formula
    ctxBuf.data.fill(0)
    for(let y = 0; y < 256; y++){
        for(let x = 0; x < 256; x++){
            let i = ((y * 256) + x)*4
            let c = Finder.solve(x, y)
            ctxBuf.data.set([c,0,0,255], i)
            if((1+x) % 64 == 0){
                ctx.putImageData(ctxBuf,0,0)
                await sleep(1000/30)
                if(checkStopped()) return
            }
        }
    }
    ctx.putImageData(ctxBuf,0,0)

    let img = canvas.toDataURL()
    let iterStr = Object.entries(Finder.iterations).map(([k,v])=>`${k}: ${v}`).join("<br>")

    // I'm just avoiding the usage of jquery or other libraries.
    let row = document.createElement("tr")
    row.innerHTML = `
    <td>${formula}</td>
    <td>${iterStr}</td>
    <td><a href="${img}" target="_blank"><img src="${img}" style="height: 96px"></a></td>
    `
    elmTable.appendChild(row)
    setTimeout(trigger, 500)
}

elmBtnStop.addEventListener("click", function(){
    stopped = !stopped
    if(stopped){
        elmBtnStop.innerText = "Stopping..."
        elmBtnStop.disabled = true
    } else {
        elmBtnStop.innerHTML = "Stop!"
        setTimeout(trigger, 500)
    }
})
await trigger()
