const osu = require('../osu.js');
const helper = require('../helper.js');
const axios = require('axios');
const { DateTime } = require('luxon')

const clamp = (num, min, max) => Math.min(Math.max(num, min), max)
const title = (type, search) => `${type == "custom" && search["rank"] ? "Rank " + search["rank"] : "Top " + type.replace(/\D/g, "")} Score Count Rankings`

module.exports = {
    command: ['osustatsrankings', 'osr', 'top100s', 'top50s', 'top25s', 'top15s', 'top8s', 'top1s'],
    description: "Get leaderboard position rankings for osu!",
    usage: '[username]',
    example: [
        {
            run: "osr",
            result: "Returns the top50s leaderboard position rankings."
        },
        {
            run: "top8s -length-min 60 -length-max 300 -min 1 -max 5 -start 2010-01-01 -end 2013-01-01 -spinners-min 1 -spinners-max 3",
            result: "Returns the top8s leaderboard position rankings with the given parameters."
        }
    ],
    call: obj => {
        return new Promise(async (resolve, reject) => {
            let { argv, msg, user_ign } = obj;

            let search = {
                "limit": 10,
                "page": 1,
            }
            let mods_array = []
            let mods_include_array = []
            let mods_exclude_array = []
            let stars = ""
            let user = user_ign[msg.author.id]
            for (const [i, arg] of argv.entries()) {
                if (arg == "-u" || arg == "-user")
                    user = argv[i + 1]
                if (arg == "-mode")
                    search["mode"] = argv[i + 1]
                if (arg == "-page" || arg == "-p")
                    search["page"] = argv[i + 1]
                if (arg == "-limit" || arg == "-l")
                    search["limit"] = argv[i + 1]
                if (arg == "-start" || arg == "-from")
                    search["from"] = argv[i + 1]
                if (arg == "-end" || arg == "-to")
                    search["to"] = argv[i + 1]
                if (arg == "-played-start" || arg == "-played-from")
                    search["played_from"] = argv[i + 1]
                if (arg == "-played-end" || arg == "-played-to")
                    search["played_to"] = argv[i + 1]
                if (arg == "-rank")
                    search["rank"] = argv[i + 1]
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
                if (arg == "-country")
                    search["country"] = argv[i + 1]
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
            const custom = search["rank"] ? "custom" : "top50s"
            const type = argv[0] == "osr" || argv[0] == "osustatsrankings" ? custom : argv[0]

            const res = await axios.get(`https://osustats.respektive.pw/rankings/${type}${searchParamsString}`)
            const rankings = res.data.leaderboard
            const last_update = res.data.last_update
            const beatmaps_amount = res.data.beatmaps_amount

            if (user && isNaN(user)) {
                const { user_id } = await osu.get_user_id(user)
                user = user_id
            }

            if (rankings.length) {
                let embed = {
                    color: 12277111,
                    footer: {
                        text: `Last update: ${DateTime.fromISO(last_update).toRelative()}${helper.sep}${last_update.replace(/T/g, " ").replace("Z", "")} UTC`
                    },
                    title: `${title(type, search)} | ${beatmaps_amount.toLocaleString()} beatmaps`
                }
                let biggest_count = isFinite(Math.max(...(rankings.map(el => el[type].toLocaleString().length)))) ? Math.max(...(rankings.map(el => el[type].toLocaleString().length))) : 0
                let longest_name = isFinite(Math.max(...(rankings.map(el => el.username?.length ?? 0)))) ? Math.max(...(rankings.map(el => el.username?.length ?? 0))) : 0
                let longest_rank = isFinite(Math.max(...(rankings.map(el => el.rank?.toString().length ?? 0)))) ? Math.max(...(rankings.map(el => el.rank?.toString().length ?? 0))) : 0
                let output = ""

                let _type
                if (type == "custom") {
                    _type = "rank_" + search["rank"]
                } else {
                    _type = type
                }

                let user_row
                if (user && !search["country"]) {
                    try {
                        const res = await axios.get(`https://osustats.respektive.pw/counts/${user}${searchParamsString}`)
                        user_row = res.data
                    } catch (e) {
                        console.log("user_row user not found")
                    }

                    if (user_row && user_row[_type] > 0) {
                        if (user_row && user_row[_type] && user_row[_type].toLocaleString().length > biggest_count)
                            biggest_count = user_row[_type].toLocaleString().length
                        if (user_row && user_row.username && user_row.username.length > longest_name)
                            longest_name = user_row.username.length
                        if (user_row && user_row[`${_type}_rank`] && user_row[`${_type}_rank`].toString().length > longest_rank)
                            longest_rank = user_row[`${_type}_rank`].toString().length
                        if (user_row && user_row.username && (user_row[_type] > (rankings[0][type] ?? 0) || user_row[`${_type}_rank`] < (rankings[0].rank ?? 0))) {
                            output += `\`#${user_row[`${_type}_rank`] ?? ""}${user_row[`${_type}_rank`] ? " ".repeat(clamp(longest_rank - user_row[`${_type}_rank`].toString().length, 0, longest_rank)) : "?".repeat(longest_rank)}\``
                            let country_code = user_row.country?.toLowerCase() ?? null
                            output += country_code ? `:flag_${country_code}:` : ":pirate_flag:"
                            output += `\`${user_row.username}${" ".repeat(clamp(longest_name - (user_row.username?.length ?? 4), 0, longest_name))}\``
                            output += ` \`${" ".repeat(clamp(biggest_count - user_row[_type].toLocaleString().length, 0, biggest_count))}${user_row[_type].toLocaleString()}\`\n`
                        }
                    }
                }

                for (const user of rankings) {
                    output += `\`#${user.rank}${" ".repeat(clamp(longest_rank - user.rank.toString().length, 0, longest_rank))}\``
                    let country_code = user.country?.toLowerCase() ?? null
                    output += country_code ? `:flag_${country_code}:` : ":pirate_flag:"
                    output += `\`${user.username}${" ".repeat(clamp(longest_name - (user.username?.length ?? 4), 0, longest_name))}\``
                    output += ` \`${" ".repeat(clamp(biggest_count - user[type].toLocaleString().length, 0, biggest_count))}${user[type].toLocaleString()}\`\n`
                }
                if (user_row && user_row[_type] > 0) {
                    if (user_row && user_row.username && (user_row[_type] < (rankings[rankings.length - 1][type] ?? 0) || user_row[`${_type}_rank`] > (rankings[rankings.length - 1].rank ?? 0))) {
                        output += `\`#${user_row[`${_type}_rank`] ?? ""}${user_row[`${_type}_rank`] ? " ".repeat(clamp(longest_rank - user_row[`${_type}_rank`].toString().length, 0, longest_rank)) : "?".repeat(longest_rank)}\``
                        let country_code = user_row.country?.toLowerCase() ?? null
                        output += country_code ? `:flag_${country_code}:` : ":pirate_flag:"
                        output += `\`${user_row.username}${" ".repeat(clamp(longest_name - (user_row.username?.length ?? 4), 0, longest_name))}\``
                        output += ` \`${" ".repeat(clamp(biggest_count - user_row[_type].toLocaleString().length, 0, biggest_count))}${user_row[_type].toLocaleString()}\`\n`
                    }
                }

                embed.description = output

                resolve({ embed: embed });

            } else {
                reject("Couldn't reach api, blame respektive");
            }
        });
    }
};
