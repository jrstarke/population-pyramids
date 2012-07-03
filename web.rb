require 'sinatra'
require_relative 'data/DataLoader.rb'
require 'json'

set :public, 'public'
set :public_folder, 'public'

get '/' do
  send_file('public/index.html')
end

get '/regions' do
  region_totals = DataLoader.region_totals()
  attribs = DataLoader.buildDictionary()
  
  output = []
  regions = attribs['geo']
  regions.each_key do |key| 
    name = regions[key]
    population = region_totals[key]
    output = output + [{:name => name, :id => key, :population => population}]
  end
  
  output = output.sort { |x,y| y[:population] <=> x[:population] }
  
  JSON.dump(output)  
end

get '/region/:region_id' do
  @region_id = params[:region_id]
  puts @region_id
  erb :population_pyramid
  #send_file('public/population_pyramid.html')
end

get '/region/:region_id/data.json' do
  region_id = params[:region_id]
  
  regions = DataLoader.regions()
  #regions = DataLoader.loadData()
  
  region = regions[region_id]
  JSON.dump(region)
end
