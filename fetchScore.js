const axios = require('axios')
const fs = require('fs')
const throat = require('throat')(40)
const _cliProgress = require('cli-progress');

const bar = new _cliProgress.Bar({
    format: 'Đang fetch [{bar}] {percentage}% | ETA: {eta} | {value}/{total} | Lỗi: {error}'
}, _cliProgress.Presets.rect)

const regSubject = /<td class="red">([^\/]*)<\/td>/gm
const regScore = /<td class="color-red">([^\/]*)<\/td>/gm
const headers = ['SBD', 'Toán', 'Văn', 'Ngoại Ngữ', 'Lí', 'Hoá', 'Sinh', 'Sử', 'Địa', 'GDCD']
const maSo = '39' // mã Sở
const _min = '000001' // bắt đầu
const _max = '000005' // kết thúc, bạn tự nhắm chừng nha

const min = parseInt(maSo+_min)
const max = parseInt(maSo+_max)
let len = max - min + 1
let current = 0
let errors = []
let filename = `${maSo}_grade12`

const fetchScore = id => {

    let promise = resolve =>
    axios.get(`https://diemthi.tuoitre.vn/kythi2020.html?FiledValue=${(maSo < 10?'0':'')}${id}&MaTruong=diemthi`)
    .then(res => {
        const data = res.data
        const subjects = []
        const scores = []
        let result = Array(9).fill(0)
        data.replace(regSubject, (match, group) => subjects.push(group))
        data.replace(regScore, (match, group) => {
            if(group === '-') scores.push(0)
            else scores.push(parseFloat(group))
        })
        subjects.forEach((each, i) => {
            if (each === 'Toán') result[0] = scores[i]
            else if (each === 'Văn') result[1] = scores[i]
            else if (each === 'Ngoại_ngữ') result[2] = scores[i]
            else if (each === 'Lí') result[3] = scores[i]
            else if (each === 'Hóa') result[4] = scores[i]
            else if (each === 'Sinh') result[5] = scores[i]
            else if (each === 'Sử') result[6] = scores[i]
            else if (each === 'Địa') result[7] = scores[i]
            else if (each === 'GDCD') result[8] = scores[i]
        })
        bar.update(++current)
        resolve([`'${(maSo < 10?'0':'')}${id}`, ...result])
    })
    .catch(() => {
        bar.setTotal(--len)
        errors.push(id)
        bar.update(current, {
            error: errors.length
        })
        resolve([])
    })
    return throat(() => new Promise(promise))
}

let promises = Array(len).fill(0).map((each, index) => fetchScore(min+index))

let splitPromises = []
let size = 2000
for (let i = 0; i < promises.length; i += size) {
    splitPromises.push(promises.slice(i, i+size))
}

console.log('\033[2J')
bar.start(len, 0, {
    error: 0
})
fs.writeFileSync(`${filename}.csv`, headers.join(';') + '\n')
Promise.all(splitPromises.map(async each => {
    await Promise.all(each).then(val => {
        fs.appendFileSync(`${filename}.csv`, val.map(each => each.join(';')).join('\n')+'\n')
    })
})).then(() => {
    fs.writeFileSync(`${filename}_errors.csv`, errors.join('\n'))
    bar.stop()
})