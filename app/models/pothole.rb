class Pothole < ApplicationRecord
  acts_as_mappable lat_column_name: :latitude,
                   lng_column_name: :longitude

  def self.markers_in_bounds bounds
    in_bounds(bounds)
      .map do |pothole|
        [
          pothole.latitude,
          pothole.longitude
        ]
      end
  end
end
