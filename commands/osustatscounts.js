const osu = require('../osu.js');
const helper = require('../helper.js');
const axios = require('axios');
const { DateTime } = require('luxon')

const ARGS = [
    "-start", "-from", "-end", "-to", "-tags", "-min", "-max",
    "-stars", "-length-min", "-length-max", "-spinners-min",
    "-spinners-max", "-mods", "-m", "-is", "-isnot", "-not",
    "-rank", "-played-from", "-played-start", "-played-to", "-played-end",
    "-mode", "-u", "-user",
]

module.exports = {
    command: ['osustatscounts', 'osc'],
    description: "Get leaderboard position counts for osu!",
    usage: '[username]',
    example: [
        {
            run: "osc xasuma",
            result: "Returns the leaderboard positions for xasuma."
        },
        {
            run: "osc wubwoofwolf -length-min 60 -length-max 300 -min 1 -max 5 -start 2010-01-01 -end 2013-01-01 -spinners-min 1 -spinners-max 3",
            result: "Returns the leaderboard positions for WubWoofWolf with the given parameters."
        }
    ],
    call: obj => {
        return new Promise(async (resolve, reject) => {
            let { argv, msg, user_ign } = obj;
            let filteredArgv = argv
            if (argv[1] && (ARGS.includes(argv[1]) || argv[1].startsWith("+"))) {
                filteredArgv = argv.splice(0, 1)
            } else {
                filteredArgv = argv.splice(0, 2)
            }

            let osu_user = helper.getUsername(filteredArgv, msg, user_ign);

            let search = {}
            let mods_array = []
            let mods_include_array = []
            let mods_exclude_array = []
            let stars = ""
            let custom_rank
            for (const [i, arg] of argv.entries()) {
                if (arg == "-u" || arg == "-user")
                    osu_user = argv[i + 1]
                if (arg == "-mode")
                    search["mode"] = argv[i + 1]
                if (arg == "-start" || arg == "-from")
                    search["from"] = argv[i + 1]
                if (arg == "-end" || arg == "-to")
                    search["to"] = argv[i + 1]
                if (arg == "-played-start" || arg == "-played-from")
                    search["played_from"] = argv[i + 1]
                if (arg == "-played-end" || arg == "-played-to")
                    search["played_to"] = argv[i + 1]
                if (arg == "-rank") {
                    search["rank"] = argv[i + 1]
                    custom_rank = argv[i + 1]
                }
                if (arg == "-tags")
                    search["tags"] = argv[i + 1]
                if (arg == "-stars") {
                    search["star_rating"] = argv[i + 1]
                } else {
                    if (arg == "-min") {
                        stars += argv[i + 1] + "-"
                    }
                    if (arg == "-max")
                        if (stars.endsWith("-"))
                            stars += argv[i + 1]
                        else
                            stars += "-" + argv[i + 1]
                }
                if (arg == "-length-min")
                    search["length_min"] = argv[i + 1]
                if (arg == "-length-max")
                    search["length_max"] = argv[i + 1]
                if (arg == "-spinners-min")
                    search["spinners_min"] = argv[i + 1]
                if (arg == "-spinners-max")
                    search["spinners_max"] = argv[i + 1]
                if (arg == "-mods" || arg == "-m") {
                    const modString = argv[i + 1].replace(/\+/g, "")
                    modString.toUpperCase().match(/.{2}/g).forEach(m => {
                        mods_array.push(m)
                    })
                }
                if (arg == "-is") {
                    const modString = argv[i + 1].replace(/\+/g, "")
                    modString.toUpperCase().match(/.{2}/g).forEach(m => {
                        mods_include_array.push(m)
                    })
                }
                if (arg == "-isnot" || arg == "-not") {
                    const modString = argv[i + 1].replace(/\+/g, "")
                    modString.toUpperCase().match(/.{2}/g).forEach(m => {
                        mods_exclude_array.push(m)
                    })
                }
            }
            if (mods_array.length > 0) {
                if (mods_array.includes("NC") && !mods_array.includes("DT"))
                    mods_array.push("DT")
                if (mods_array.includes("PF") && !mods_array.includes("SD"))
                    mods_array.push("SD")

                search["mods"] = mods_array.join("")
            }
            if (mods_include_array.length > 0) {
                if (mods_include_array.includes("NC") && !mods_include_array.includes("DT"))
                    mods_include_array.push("DT")
                if (mods_include_array.includes("PF") && !mods_include_array.includes("SD"))
                    mods_include_array.push("SD")

                search["mods_include"] = mods_include_array.join("")
            }
            if (mods_exclude_array.length > 0) {
                if (mods_exclude_array.includes("NC") && !mods_exclude_array.includes("DT"))
                    mods_exclude_array.push("DT")
                if (mods_exclude_array.includes("PF") && !mods_exclude_array.includes("SD"))
                    mods_exclude_array.push("SD")

                search["mods_exclude"] = mods_exclude_array.join("")
            }
            if (stars.length > 0) {
                if (stars.startsWith("-")) {
                    stars = "0" + stars
                }
                if (stars.endsWith("-")) {
                    stars += "99"
                }
                search["star_rating"] = stars
            }

            let searchParamsString = "";
            if (Object.keys(search).length != 0) {
                const params = new URLSearchParams(search)
                searchParamsString = "?" + params.toString()
            }

            if (!osu_user) {
                if (user_ign[msg.author.id] == undefined)
                    reject(helper.commandHelp('ign-set'));
                else
                    reject(helper.commandHelp('osu'));

                return false;
            }

            const { user_id } = await osu.get_user_id(osu_user)

            let counts
            try {
                const res = await axios.get(`https://osustats.respektive.pw/counts/${user_id}${searchParamsString}`)
                counts = res.data
            } catch (e) {
                counts = e.response.data
            }

            const last_update = counts.last_update

            if (counts && !counts.error) {
                osu.get_user({ u: osu_user }, (err, embed) => {
                    if (err) {
                        reject(err);
                        helper.error(err);
                        return false;
                    }

                    let output = `\`\`\`\n`

                    if (custom_rank && counts[`rank_${custom_rank}`])
                        output += `#${custom_rank}`.padEnd(8) + `: ${counts["rank_" + custom_rank].toLocaleString().padStart(7) ?? 0}\n`
                    output += `Top 1s  : ${counts.top1s.toLocaleString().padStart(7) ?? "0".padStart(7)}\t${counts.top1s_rank ? "#" + counts.top1s_rank.toLocaleString() : ""}\n`
                    output += `Top 8s  : ${counts.top8s.toLocaleString().padStart(7) ?? "0".padStart(7) ?? 0}\t${counts.top8s_rank ? "#" + counts.top8s_rank.toLocaleString() : ""}\n`
                    output += `Top 15s : ${counts.top15s.toLocaleString().padStart(7) ?? "0".padStart(7) ?? 0}\t${counts.top15s_rank ? "#" + counts.top15s_rank.toLocaleString() : ""}\n`
                    output += `Top 25s : ${counts.top25s.toLocaleString().padStart(7) ?? "0".padStart(7) ?? 0}\t${counts.top25s_rank ? "#" + counts.top25s_rank.toLocaleString() : ""}\n`
                    output += `Top 50s : ${counts.top50s.toLocaleString().padStart(7) ?? "0".padStart(7) ?? 0}\t${counts.top50s_rank ? "#" + counts.top50s_rank.toLocaleString() : ""}\n`
                    output += `Top 100s: ${counts.top100s.toLocaleString().padStart(7) ?? "0".padStart(7) ?? 0}\t${counts.top100s_rank ? "#" + counts.top100s_rank.toLocaleString() : ""}\n`
                    output += `\`\`\``

                    embed.fields = []
                    embed.footer = {
                        text: `Last update: ${DateTime.fromISO(last_update).toRelative()}${helper.sep}${last_update.replace(/T/g, " ").replace("Z", "")} UTC${helper.sep}${counts["beatmaps_amount"].toLocaleString()} beatmaps`
                    }
                    embed.description = output

                    resolve({ embed: embed });
                })

            } else {
                reject("Couldn't find this user or the user has no top50s");
            }
        });
    }
};
